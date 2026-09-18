import {Knex} from 'knex';

import knex from '@/db/knex_config';
import {SysInfoRepo} from '@/db/sysinfo.repo';

/**
 * Remembers a blob's ciphertext hash so a scheduled backup does not re-read every gigabyte the
 * family owns, every night, to learn nothing changed.
 *
 * Content addressing makes snapshots cheap at the *storage* layer — an unchanged blob is never
 * uploaded twice. It does nothing for the *hashing* layer: without this, computing the address
 * still means reading every byte. On the target hardware (a Pi 5, blobs in the multiple gigabytes)
 * that is hours of I/O nightly for a result identical to last night's, which is how a family ends
 * up turning backup off.
 *
 * **Host state, not realm data.** It lives in `sys_info`, which `realm_scope.ts` classifies `host`,
 * so it never travels in a bundle. It is also pure optimisation: a cold cache must produce exactly
 * the same bundle as a warm one, and `blob_hash_cache.test.ts` asserts that.
 *
 * ## What counts as "the same bytes"
 *
 * The cache key has to change whenever the content does, using only what is cheap to read. For a
 * `user_file` that is `fileId:fileSize:updatedAt` — the row is rewritten on every upload, including
 * `initChunkedUpload`, which runs before any chunk is written.
 *
 * **The one hole, stated rather than discovered:** `uploadChunkBytes` writes chunk objects without
 * touching the row (`user_file.service.ts`). Chunks are only reachable after an `init` that does
 * bump `updatedAt`, so the normal path is covered — but a caller that rewrote chunks without an
 * init would be missed. If that path ever becomes reachable, this cache is wrong and a
 * `user_file.contentHash` column written at upload time is the fix.
 *
 * Image-namespace blobs are deliberately **not** cached: the seam offers no `stat` for them, so
 * there is no cheap token that changes with content. After the `uf_` fix that set is small — cover
 * images that are real filenames, plus profile pictures — while the gigabytes live in `user_file`.
 */

export const BLOB_HASH_CACHE_ID = 'backup_blob_hashes';

export type CachedHash = {hash: string; size: number};

export class BlobHashCache {
  private entries: Record<string, CachedHash> = {};
  private loaded = false;
  private dirty = false;

  constructor(
    private readonly sysInfo = new SysInfoRepo(),
    private readonly db: Knex = knex,
  ) {
    void this.db;
  }

  /** The token that identifies a `user_file`'s bytes without reading them. */
  static tokenForUserFile(row: {_id: string; fileSize?: unknown; updatedAt?: unknown}, filename: string): string {
    const updated = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? '');
    return `uf:${row._id}:${filename}:${String(row.fileSize ?? '')}:${updated}`;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    const stored = (await this.sysInfo.findById(BLOB_HASH_CACHE_ID))?.data as Record<string, CachedHash> | undefined;
    this.entries = stored && typeof stored === 'object' ? stored : {};
    this.loaded = true;
  }

  get(token: string): CachedHash | null {
    return this.entries[token] ?? null;
  }

  set(token: string, value: CachedHash): void {
    const existing = this.entries[token];
    if (existing && existing.hash === value.hash && existing.size === value.size) return;
    this.entries[token] = value;
    this.dirty = true;
  }

  /**
   * Drop everything not seen this run, then persist.
   *
   * Without the sweep the cache grows forever — every deleted file and every superseded version
   * keeps its entry, and on an appliance that is a row that only ever gets bigger.
   */
  async flush(seen: Iterable<string>): Promise<void> {
    const keep = new Set(seen);
    const before = Object.keys(this.entries).length;
    const kept: Record<string, CachedHash> = {};
    for (const token of keep) if (this.entries[token]) kept[token] = this.entries[token];
    if (Object.keys(kept).length !== before) this.dirty = true;
    this.entries = kept;
    if (!this.dirty) return;
    await this.sysInfo.create({_id: BLOB_HASH_CACHE_ID, data: this.entries as any});
    this.dirty = false;
  }

  get size(): number {
    return Object.keys(this.entries).length;
  }
}
