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
  MANIFEST_ENTRY,
  REALM_ENTRY,
  blobObjectName,
  encodeEntries,
  encodeHeader,
  ndjson,
  newSnapshotId,
  sha256Hex,
  snapshotObjectName,
} from './bundle_format';

export type BundleWriterOptions = {
  target: BackupTarget;
  realmId: string;
  /**
   * The realm salt and derived backup key. Deliberately not a phrase: a scheduled writer runs with
   * no guardian present, and what it holds at rest must not also open KEY-1's recovery kit.
   */
  keyring: BundleKeyring;
  producer: {app: string; version: string; profile: string};
  snapshotId?: string;
  now?: Date;
};

export type BlobSource = {
  entry: Omit<BundleBlobEntry, 'blobId' | 'size'>;
  /** Opened only when the blob is actually needed — a blob the target already holds is never read. */
  open: () => Promise<Readable> | Readable;
  /** Ciphertext SHA-256, already known. Supply it to skip re-hashing gigabytes every run. */
  knownHash?: string;
  knownSize?: number;
  /** Opaque key the caller uses to remember this blob's hash between runs. */
  cacheToken?: string;
};

/**
 * Assembles one snapshot and writes it to a target.
 *
 * The API is incremental rather than "hand me the whole realm", because the two halves of a realm
 * have opposite weight profiles and must be treated differently (format doc §4/§6):
 *
 *  - **Records** are MBs and are buffered per type, then written into the encrypted `.krb`. Full
 *    dump every run, so every snapshot is an independent restore point.
 *  - **Blobs** are GBs and are streamed straight through to the target, never held in memory —
 *    and one that the target already holds is not re-uploaded at all. That skip is the whole
 *    "incremental by construction" story, and it is why `BlobSource.open` is a callback.
 */
export class RealmBundleWriter {
  private readonly recordsByType = new Map<string, {version: number; rows: BundleRecord[]}>();
  private readonly blobEntries: BundleBlobEntry[] = [];
  private realm: unknown = {};
  private revisions: Record<string, number> = {};
  private excluded: string[] = [];
  private extensions: BundleManifest['extensions'] = [];
  private memberCount = 0;
  private authorityEpoch: number | null = null;
  private readonly encInfoV = new Set<number>();
  private readonly encInfoSv = new Set<number>();
  private blobBytes = 0;
  private uploaded = 0;
  private skipped = 0;
  /** How many blobs had to be read and hashed. The number REALM-7 exists to drive to zero. */
  private hashedCount = 0;

  readonly snapshotId: string;
  private readonly createdAt: Date;

  constructor(private readonly opts: BundleWriterOptions) {
    this.createdAt = opts.now ?? new Date();
    this.snapshotId = opts.snapshotId ?? newSnapshotId(this.createdAt);
  }

  setRealm(realm: unknown): void {
    this.realm = realm;
  }

  /** Per-member `userId -> max change-log id` (§7). There is no realm-wide revision to use instead. */
  setRevisions(revisions: Record<string, number>): void {
    this.revisions = revisions;
    this.memberCount = Object.keys(revisions).length;
  }

  /** What the bundle deliberately left behind, so a restore can say so in words (§7). */
  setExcluded(excluded: string[]): void {
    this.excluded = excluded;
  }

  setExtensions(extensions: BundleManifest['extensions']): void {
    this.extensions = extensions;
  }

  setAuthorityEpoch(epoch: number | null): void {
    this.authorityEpoch = epoch;
  }

  addRecord(recordType: string, recordVersion: number, record: BundleRecord): void {
    let bucket = this.recordsByType.get(recordType);
    if (!bucket) {
      bucket = {version: recordVersion, rows: []};
      this.recordsByType.set(recordType, bucket);
    }
    bucket.rows.push(record);

    // Observed, never chosen: a realm holds a mix of encInfo versions because the sv:2 rollout is
    // cap-gated per client, so the manifest reports what is actually in the snapshot.
    const encInfo = (record.data as any)?.encInfo;
    if (encInfo && typeof encInfo === 'object') {
      this.encInfoV.add(Number(encInfo.v ?? 1));
      this.encInfoSv.add(Number(encInfo.sv ?? 1));
    }
  }

  /**
   * Stream one blob to the target unless it is already there.
   *
   * Content addressing means "already there" is decidable without reading the local file, so the
   * common case for an unchanged family is a `stat` per blob and no bytes moved at all.
   */
  async addBlob(source: BlobSource): Promise<{hash: string; size: number; uploaded: boolean; hashed: boolean}> {
    let hash = source.knownHash;
    let size = source.knownSize;
    let buffered: Buffer | undefined;
    let hashed = false;

    if (!hash || size === undefined) {
      buffered = await streamToBuffer(await source.open());
      hash = sha256Hex(buffered);
      size = buffered.length;
      hashed = true;
    }

    const name = blobObjectName(this.opts.realmId, hash);
    const existing = await this.opts.target.stat(name);
    let uploaded = false;

    // Size is checked as well as presence: a target that holds the right name at the wrong length
    // is corrupt, and silently trusting it would carry that corruption into every later snapshot.
    if (!existing || existing.size !== size) {
      await this.opts.target.put(name, buffered ?? (await source.open()));
      uploaded = true;
      this.uploaded += 1;
    } else {
      this.skipped += 1;
    }

    this.blobEntries.push({...source.entry, blobId: hash, size});
    this.blobBytes += size;
    if (hashed) this.hashedCount += 1;
    return {hash, size, uploaded, hashed};
  }

  /** A chunked `user_file` has no base object on disk, so its parent entry names its chunks (§6.2). */
  addChunkedParent(entry: Omit<BundleBlobEntry, 'blobId'>, chunkHashes: string[]): void {
    this.blobEntries.push({...entry, chunkHashes});
  }

  /**
   * Serialize, compress, encrypt, and write the `.krb`.
   *
   * Order matters and only one order is correct: compress **then** encrypt. Ciphertext does not
   * compress, so the reverse would spend the CPU and save nothing.
   */
  async finish(): Promise<{
    manifest: BundleManifest;
    objectName: string;
    uploaded: number;
    skipped: number;
    hashed: number;
  }> {
    const entries: Array<{path: string; content: Buffer}> = [];
    const recordTypes: BundleManifest['recordTypes'] = [];

    for (const [type, {version, rows}] of [...this.recordsByType.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const content = ndjson(rows);
      const path = type === 'key_entry' ? 'key-envelopes/key_entry.ndjson' : `records/${type}.ndjson`;
      entries.push({path, content});
      recordTypes.push({type, version, count: rows.length, sha256: sha256Hex(content)});
    }

    const blobIndex = ndjson(this.blobEntries);

    const manifest: BundleManifest = {
      bundleFormatVersion: BUNDLE_FORMAT_VERSION,
      realmId: this.opts.realmId,
      snapshotId: this.snapshotId,
      createdAt: this.createdAt.toISOString(),
      producer: this.opts.producer,
      authorityEpoch: this.authorityEpoch,
      revisions: this.revisions,
      memberCount: this.memberCount,
      recordTypes,
      blobCount: this.blobEntries.length,
      blobBytes: this.blobBytes,
      cryptoFormatVersions: {
        encInfoV: [...this.encInfoV].sort((a, b) => a - b),
        encInfoSv: [...this.encInfoSv].sort((a, b) => a - b),
      },
      extensions: this.extensions,
      excluded: this.excluded,
    };

    // Manifest first so a reader can answer "what is this and is it mine" from the front of the
    // payload; blob index last because it is the largest of the small parts.
    const payload = encodeEntries([
      {path: MANIFEST_ENTRY, content: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')},
      {path: REALM_ENTRY, content: Buffer.from(JSON.stringify(this.realm, null, 2), 'utf8')},
      ...entries,
      {path: BLOB_INDEX_ENTRY, content: blobIndex},
    ]);

    const header: BundleHeader = {
      bundleFormatVersion: BUNDLE_FORMAT_VERSION,
      realmId: this.opts.realmId,
      snapshotId: this.snapshotId,
      createdAt: manifest.createdAt,
      // The realm salt, the same in every snapshot. It is not secret, and it is here so a family
      // restoring from their printed phrase alone can re-derive without this host.
      kdf: {alg: 'HKDF-SHA256', salt: this.opts.keyring.salt.toString('base64url'), stretch: null},
      cipher: 'AES-256-GCM',
      compression: 'gzip',
    };

    const headerBytes = encodeHeader(header);
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.opts.keyring.key, iv);
    cipher.setAAD(headerBytes);
    const body = Buffer.concat([cipher.update(zlib.gzipSync(payload)), cipher.final()]);

    const objectName = snapshotObjectName(this.opts.realmId, this.snapshotId);
    await this.opts.target.put(objectName, Buffer.concat([headerBytes, iv, body, cipher.getAuthTag()]));

    return {manifest, objectName, uploaded: this.uploaded, skipped: this.skipped, hashed: this.hashedCount};
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}
