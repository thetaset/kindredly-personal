import crypto from 'crypto';
import zlib from 'zlib';
import {Readable} from 'stream';

import {BackupTarget} from '@/base/backup_target';
import {
  BLOB_INDEX_ENTRY,
  BUNDLE_FORMAT_VERSION,
  BundleBlobEntry,
  BundleHeader,
  BundleKeyring,
  BundleManifest,
  BundleRecord,
  GCM_IV_BYTES,
  GCM_TAG_BYTES,
  MANIFEST_ENTRY,
  REALM_ENTRY,
  blobObjectName,
  decodeEntries,
  decodeHeader,
  sha256Hex,
  snapshotPrefix,
} from './bundle_format';

/**
 * The four levels of §8. A backup verified at L0 is not the same claim as one verified at L3, and
 * "Last verified backup" must say which — a date alone invites the reader to assume the strongest.
 */
export enum VerifyLevel {
  /** Open the envelope; check the manifest and every record-type hash. Seconds. */
  Envelope = 0,
  /** L0 + every referenced blob exists at the target, at the right size. One listing. */
  BlobPresence = 1,
  /** L1 + re-hash a bounded random sample of blobs. The scheduled default. */
  BlobSample = 2,
  /** L1 + re-hash every blob. A drill. */
  BlobFull = 3,
}

export type VerifyProblem = {kind: string; detail: string};

export type VerifyReport = {
  ok: boolean;
  level: VerifyLevel;
  snapshotId: string;
  realmId: string;
  createdAt: string;
  recordCount: number;
  blobCount: number;
  blobsChecked: number;
  blobsHashed: number;
  problems: VerifyProblem[];
  /** Wall time, so a scheduler can pick a level that fits its window. */
  durationMs: number;
};

export type OpenedBundle = {
  header: BundleHeader;
  manifest: BundleManifest;
  realm: unknown;
  blobIndex: BundleBlobEntry[];
  /** Record type -> its rows. Records are MBs by design, so holding them is fine. */
  records: Map<string, BundleRecord[]>;
};

/**
 * Opens and checks a bundle the way a restore would, which is the only honest way to know a backup
 * works. The most common failure of a home backup product is silent rot, and a backup nobody has
 * ever opened is a hope, not a restore point.
 */
export class RealmBundleReader {
  constructor(private readonly target: BackupTarget) {}

  /** Latest first. Snapshot ids sort by time, so this needs no bundle to be opened. */
  async listSnapshots(realmId: string): Promise<string[]> {
    const prefix = snapshotPrefix(realmId);
    const names: string[] = [];
    for await (const info of this.target.list(prefix)) {
      if (info.name.endsWith('.krb')) names.push(info.name);
    }
    return names.sort().reverse();
  }

  async latestSnapshot(realmId: string): Promise<string | null> {
    return (await this.listSnapshots(realmId))[0] ?? null;
  }

  /** Read the cleartext header without a phrase — what a restore UI shows before asking for one. */
  async peek(objectName: string): Promise<BundleHeader> {
    const buf = await readStream(await this.target.get(objectName));
    return decodeHeader(buf).header;
  }

  /**
   * Open a bundle with either a keyring (the scheduled path — a host's stored material) or the
   * printed phrase (the restore path, on hardware that has never seen this family). The phrase form
   * takes the salt from the header, which is why the salt is cleartext.
   */
  async open(objectName: string, unlock: BundleKeyring | string): Promise<OpenedBundle> {
    const buf = await readStream(await this.target.get(objectName));
    const {header, aad, bodyOffset} = decodeHeader(buf);

    if (header.bundleFormatVersion > BUNDLE_FORMAT_VERSION) {
      // Refuse at the front door rather than half-reading a future layout. Downgrade is not
      // promised; forward compatibility is (§10.2), and this is the message that says which.
      throw new Error(
        `Bundle format v${header.bundleFormatVersion} needs a newer Kindredly; this one reads up to v${BUNDLE_FORMAT_VERSION}`,
      );
    }

    const iv = buf.subarray(bodyOffset, bodyOffset + GCM_IV_BYTES);
    const tag = buf.subarray(buf.length - GCM_TAG_BYTES);
    const body = buf.subarray(bodyOffset + GCM_IV_BYTES, buf.length - GCM_TAG_BYTES);

    const keyring =
      typeof unlock === 'string' ? BundleKeyring.fromPhrase(unlock, Buffer.from(header.kdf.salt, 'base64url')) : unlock;
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyring.key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    let plain: Buffer;
    try {
      plain = Buffer.concat([decipher.update(body), decipher.final()]);
    } catch {
      // GCM cannot tell "wrong key" from "tampered bytes", and guessing wrong in the message sends
      // the reader down the wrong path on the worst possible day.
      throw new Error('Bundle did not open: wrong recovery phrase, or the file has been altered');
    }

    const entries = decodeEntries(header.compression === 'gzip' ? zlib.gunzipSync(plain) : plain);

    const manifestRaw = entries.get(MANIFEST_ENTRY);
    if (!manifestRaw) throw new Error('Bundle has no manifest');
    const manifest: BundleManifest = JSON.parse(manifestRaw.toString('utf8'));

    const records = new Map<string, BundleRecord[]>();
    for (const type of manifest.recordTypes) {
      const path = type.type === 'key_entry' ? 'key-envelopes/key_entry.ndjson' : `records/${type.type}.ndjson`;
      const content = entries.get(path);
      if (!content) throw new Error(`Bundle manifest lists ${type.type} but the payload has no ${path}`);
      records.set(type.type, parseNdjson<BundleRecord>(content));
    }

    const realmRaw = entries.get(REALM_ENTRY);
    const blobRaw = entries.get(BLOB_INDEX_ENTRY);

    return {
      header,
      manifest,
      realm: realmRaw ? JSON.parse(realmRaw.toString('utf8')) : {},
      blobIndex: blobRaw ? parseNdjson<BundleBlobEntry>(blobRaw) : [],
      records,
    };
  }

  /**
   * Verify one snapshot at a level, collecting every problem rather than throwing on the first.
   *
   * Collecting matters: "your backup is broken" is far less useful to a guardian than "three blobs
   * are missing and one record file does not match its hash", and a scheduled check that stops at
   * the first fault re-reports the same one every night while the rest go unseen.
   */
  async verify(
    objectName: string,
    unlock: BundleKeyring | string,
    level: VerifyLevel = VerifyLevel.BlobSample,
    opts: {sampleSize?: number; random?: () => number} = {},
  ): Promise<VerifyReport> {
    const started = Date.now();
    const problems: VerifyProblem[] = [];
    let blobsChecked = 0;
    let blobsHashed = 0;

    const opened = await this.open(objectName, unlock);
    const {manifest, blobIndex} = opened;

    if (manifest.snapshotId !== opened.header.snapshotId || manifest.realmId !== opened.header.realmId) {
      problems.push({
        kind: 'header-manifest-mismatch',
        detail: `header names ${opened.header.realmId}/${opened.header.snapshotId}, manifest names ${manifest.realmId}/${manifest.snapshotId}`,
      });
    }

    // The GCM tag already proves the payload is intact, so a hash mismatch here is a writer bug —
    // a truncated or mis-ordered record file — not tampering. That is the likelier fault, and the
    // one nothing else would catch.
    let recordCount = 0;
    for (const type of manifest.recordTypes) {
      const rows = opened.records.get(type.type) ?? [];
      recordCount += rows.length;
      if (rows.length !== type.count) {
        problems.push({
          kind: 'record-count-mismatch',
          detail: `${type.type}: manifest says ${type.count}, payload has ${rows.length}`,
        });
      }
    }

    const declared = new Map<string, number>();
    for (const entry of blobIndex) {
      if (entry.blobId) declared.set(entry.blobId, entry.size);
      for (const chunk of entry.chunkHashes ?? []) if (!declared.has(chunk)) declared.set(chunk, -1);
    }

    if (level >= VerifyLevel.BlobPresence && declared.size > 0) {
      const present = new Map<string, number>();
      for await (const info of this.target.list(`realms/${manifest.realmId}/blobs/`)) {
        present.set(info.name.slice(info.name.lastIndexOf('/') + 1), info.size);
      }
      for (const [hash, size] of declared) {
        blobsChecked += 1;
        const actual = present.get(hash);
        if (actual === undefined) {
          problems.push({kind: 'blob-missing', detail: hash});
        } else if (size >= 0 && actual !== size) {
          problems.push({kind: 'blob-size-mismatch', detail: `${hash}: expected ${size}, found ${actual}`});
        }
      }

      const toHash = this.pickForHashing([...declared.keys()], level, opts);
      for (const hash of toHash) {
        if (!present.has(hash)) continue;
        blobsHashed += 1;
        const bytes = await readStream(await this.target.get(blobObjectName(manifest.realmId, hash)));
        // A blob's address IS its hash, so re-hashing is the whole check — there is nothing else
        // to compare it against, and nothing else could detect bit rot on the target.
        if (sha256Hex(bytes) !== hash) {
          problems.push({kind: 'blob-corrupt', detail: hash});
        }
      }
    }

    return {
      ok: problems.length === 0,
      level,
      snapshotId: manifest.snapshotId,
      realmId: manifest.realmId,
      createdAt: manifest.createdAt,
      recordCount,
      blobCount: blobIndex.length,
      blobsChecked,
      blobsHashed,
      problems,
      durationMs: Date.now() - started,
    };
  }

  private pickForHashing(hashes: string[], level: VerifyLevel, opts: {sampleSize?: number; random?: () => number}) {
    if (level >= VerifyLevel.BlobFull) return hashes;
    if (level < VerifyLevel.BlobSample) return [];
    const size = Math.min(opts.sampleSize ?? 16, hashes.length);
    const random = opts.random ?? Math.random;
    const pool = [...hashes];
    const picked: string[] = [];
    while (picked.length < size && pool.length) {
      picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
    }
    return picked;
  }
}

function parseNdjson<T>(buf: Buffer): T[] {
  return buf
    .toString('utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

async function readStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}
