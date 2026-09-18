import crypto from 'crypto';

/**
 * The realm bundle container: constants, types, the header, and the key derivation.
 *
 * This is `docs/proposals/realm-bundle-format.md` expressed as code. The doc is the specification
 * and stays the place decisions are argued; this file is the only place they are implemented, so a
 * writer and a reader cannot drift apart on a byte offset.
 *
 * Layout of a `.krb` (§3.1):
 *
 *   0      8   magic "KNDRLM01"
 *   8      4   uint32 BE header length
 *   12     N   header, UTF-8 JSON, CLEARTEXT
 *   12+N  12   AES-GCM IV
 *   24+N   -   ciphertext, then the 16-byte GCM tag
 *
 * The header is cleartext so a restore tool can identify a file and ask for the right recovery
 * phrase before it can decrypt anything, and it is the AEAD associated data so it cannot be
 * swapped or downgraded without the tag failing.
 */

export const BUNDLE_MAGIC = Buffer.from('KNDRLM01', 'ascii');
export const BUNDLE_FORMAT_VERSION = 1;
export const GCM_IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;
export const KDF_SALT_BYTES = 32;

/** Derivation info strings (§3.2). Domain separation is the whole point; never reuse one. */
export const INFO_BUNDLE_KEY = 'kindredly/backup-bundle/v1';
export const INFO_RECOVERY_KIT_KEY = 'kindredly/recovery-kit/v1';

export type BundleHeader = {
  bundleFormatVersion: number;
  realmId: string;
  snapshotId: string;
  createdAt: string;
  kdf: {alg: 'HKDF-SHA256'; salt: string; stretch: null};
  cipher: 'AES-256-GCM';
  compression: 'gzip' | 'none';
};

export type BundleRecord = {
  realmId: string;
  recordType: string;
  recordVersion: number;
  recordId: string;
  deletedAt: string | null;
  data: Record<string, unknown>;
};

/** One line of `integrity/blobs.ndjson` (§6.3). A chunked parent carries `chunkHashes` and no `blobId`. */
export type BundleBlobEntry = {
  blobId?: string;
  size: number;
  namespace: 'userFile' | 'image';
  fileId?: string;
  ref?: Record<string, string>;
  encrypted?: boolean;
  chunkHashes?: string[];
};

export type BundleManifest = {
  bundleFormatVersion: number;
  realmId: string;
  snapshotId: string;
  createdAt: string;
  producer: {app: string; version: string; profile: string};
  authorityEpoch: number | null;
  revisions: Record<string, number>;
  memberCount: number;
  recordTypes: Array<{type: string; version: number; count: number; sha256: string}>;
  blobCount: number;
  blobBytes: number;
  cryptoFormatVersions: {encInfoV: number[]; encInfoSv: number[]};
  extensions: Array<{id: string; version: number; class: 'REQUIRED_TO_INTERPRET' | 'PRESERVE_OPAQUE'}>;
  excluded: string[];
};

export const MANIFEST_ENTRY = 'manifest.json';
export const REALM_ENTRY = 'realm.json';
export const BLOB_INDEX_ENTRY = 'integrity/blobs.ndjson';

/** Object names inside a target (§2). One place, so writer and reader cannot disagree. */
export const snapshotObjectName = (realmId: string, snapshotId: string) =>
  `realms/${realmId}/snapshots/${snapshotId}.krb`;
export const snapshotPrefix = (realmId: string) => `realms/${realmId}/snapshots/`;
export const blobObjectName = (realmId: string, hash: string) => `realms/${realmId}/blobs/${hash.slice(0, 2)}/${hash}`;

/**
 * `<UTC basic timestamp>-<8 hex>` (§2). Sortable by name, which is how "latest snapshot" is found
 * without opening anything — the alternative is reading every header on a directory listing.
 */
export function newSnapshotId(now: Date = new Date()): string {
  const iso = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  return `${iso}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Normalize a printed recovery phrase before it becomes key material.
 *
 * KEY-1 prints Crockford Base32 precisely so a human can retype it: case-insensitive, with `O`
 * read as `0` and `I`/`L` as `1`, and separators that carry no meaning. Normalizing here rather
 * than at the input field means a phrase typed with different spacing on a different device still
 * derives the same key — and a bundle that will not open is indistinguishable from a lost one.
 */
export function normalizeRecoveryPhrase(phrase: string): string {
  const cleaned = String(phrase || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (!cleaned) throw new Error('Recovery phrase is empty');
  return cleaned;
}

/**
 * Derive one 32-byte key from the phrase and the realm salt.
 *
 * **The salt is per realm, not per bundle** (KEY-11 D11, 2026-09-02). That is what lets a box hold
 * the derived backup key and never the phrase: with a per-bundle salt, writing tomorrow's snapshot
 * would need the phrase again, so the box would have to keep it — and the phrase also derives
 * KEY-1's recovery-kit key, which would put the recovery kit on the same stolen disk.
 *
 * The salt costs nothing here. It is not secret, and its job in HKDF-Extract is to diversify a
 * low-entropy input; the root carries 128 uniform random bits, so one salt per realm is as good as
 * one per bundle. It rides in every header so a family restoring from paper alone can re-derive.
 *
 * No PBKDF2 stretch, for the same reason: stretching defends a guessable secret and costs seconds
 * on a Pi. `header.kdf.stretch` is present and null so adding one later is not a format break.
 */
export function deriveKey(phrase: string, salt: Buffer, info: string): Buffer {
  const ikm = Buffer.from(normalizeRecoveryPhrase(phrase), 'ascii');
  return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from(info, 'utf8'), 32));
}

export const deriveBundleKey = (phrase: string, salt: Buffer) => deriveKey(phrase, salt, INFO_BUNDLE_KEY);

/**
 * KEY-1's recovery-kit key. Present so the domain separation is visible in one place — **nothing
 * in the backup path calls this**, and a box must never be able to.
 */
export const deriveRecoveryKitKey = (phrase: string, salt: Buffer) => deriveKey(phrase, salt, INFO_RECOVERY_KIT_KEY);

/**
 * What a host holds in order to write and open this realm's bundles: the realm salt and the
 * derived backup key. **Never the phrase.**
 *
 * That distinction is the whole decision (KEY-11 D11). A box needs to back up and self-verify
 * unattended, so it needs key material at rest. Storing the phrase would hand a stolen disk both
 * branches — backups *and* the recovery kit. Storing this hands it one, and HKDF is one-way, so
 * `key` cannot be walked back to the phrase.
 *
 * A family restoring on new hardware does not need this object at all: the salt is in the bundle
 * header and the phrase is on their printed sheet.
 */
export class BundleKeyring {
  private constructor(
    readonly salt: Buffer,
    readonly key: Buffer,
  ) {}

  /** First time a realm is set up for backup: mint a realm salt and derive from the printed phrase. */
  static newForRealm(phrase: string): BundleKeyring {
    return BundleKeyring.fromPhrase(phrase, crypto.randomBytes(KDF_SALT_BYTES));
  }

  /** Restore path: the phrase off the printed sheet, the salt out of the bundle header. */
  static fromPhrase(phrase: string, salt: Buffer): BundleKeyring {
    return new BundleKeyring(salt, deriveBundleKey(phrase, salt));
  }

  /** Scheduled path: what the host persisted, with no phrase anywhere. */
  static fromStored(stored: {salt: string; key: string}): BundleKeyring {
    const key = Buffer.from(stored.key, 'base64url');
    if (key.length !== 32) throw new Error('Stored bundle key is not 32 bytes');
    return new BundleKeyring(Buffer.from(stored.salt, 'base64url'), key);
  }

  /** Exactly what a host may persist. If anything else ends up next to it, that is the bug. */
  toStored(): {salt: string; key: string} {
    return {salt: this.salt.toString('base64url'), key: this.key.toString('base64url')};
  }
}

export function encodeHeader(header: BundleHeader): Buffer {
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(json.length, 0);
  return Buffer.concat([BUNDLE_MAGIC, len, json]);
}

/** Parse the cleartext prefix. Returns the header, its raw bytes (the AAD), and where the body starts. */
export function decodeHeader(buf: Buffer): {header: BundleHeader; aad: Buffer; bodyOffset: number} {
  if (buf.length < BUNDLE_MAGIC.length + 4) throw new Error('Not a realm bundle: too short');
  if (!buf.subarray(0, BUNDLE_MAGIC.length).equals(BUNDLE_MAGIC)) {
    throw new Error('Not a realm bundle: bad magic');
  }
  const len = buf.readUInt32BE(BUNDLE_MAGIC.length);
  const start = BUNDLE_MAGIC.length + 4;
  if (len === 0 || start + len > buf.length) throw new Error('Not a realm bundle: bad header length');
  let header: BundleHeader;
  try {
    header = JSON.parse(buf.subarray(start, start + len).toString('utf8'));
  } catch {
    throw new Error('Not a realm bundle: unreadable header');
  }
  return {header, aad: buf.subarray(0, start + len), bodyOffset: start + len};
}

/**
 * The payload is a flat sequence of named entries, not a tar or a zip.
 *
 *   4 bytes uint32 BE  path length
 *   path bytes (utf8)
 *   8 bytes uint64 BE  content length
 *   content bytes
 *
 * Deliberately not tar: the payload is encrypted, so nothing outside our own tools can read it
 * anyway, and the argument for a standard format is that a human can inspect it — which does not
 * apply here. Deliberately not JSZip, which is already a dependency: it buffers the whole archive
 * in memory, and the box this runs on is a 2 GB Pi. Records are MBs and fit; the format's large
 * half never enters this stream at all, because blobs are separate objects by design (§2).
 */
export function encodeEntries(entries: Array<{path: string; content: Buffer}>): Buffer {
  const parts: Buffer[] = [];
  for (const {path: p, content} of entries) {
    const pathBytes = Buffer.from(p, 'utf8');
    const head = Buffer.alloc(12);
    head.writeUInt32BE(pathBytes.length, 0);
    head.writeBigUInt64BE(BigInt(content.length), 4);
    parts.push(head, pathBytes, content);
  }
  return Buffer.concat(parts);
}

export function decodeEntries(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 12 > buf.length) throw new Error('Bundle payload is truncated');
    const pathLen = buf.readUInt32BE(offset);
    const contentLen = Number(buf.readBigUInt64BE(offset + 4));
    offset += 12;
    if (offset + pathLen + contentLen > buf.length) throw new Error('Bundle payload is truncated');
    const p = buf.subarray(offset, offset + pathLen).toString('utf8');
    offset += pathLen;
    out.set(p, buf.subarray(offset, offset + contentLen));
    offset += contentLen;
  }
  return out;
}

export const sha256Hex = (data: Buffer): string => crypto.createHash('sha256').update(data).digest('hex');

export const ndjson = (rows: unknown[]): Buffer =>
  Buffer.from(rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
