import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import {Readable} from 'stream';
import {randomUUID} from 'crypto';

import {BackupObjectInfo, BackupTarget} from './backup_target';
import {resolveWithinRoot} from './storage_path';

/**
 * A directory. That is the whole adapter — which is the point of decision D2: a USB stick, an
 * external drive, a NAS mount and a plain folder are all the same target, and none of them is a
 * running instance that could reintroduce the replica-consistency problem single-writer avoids.
 *
 * Two properties this has to get right, because a backup that is quietly wrong is worse than no
 * backup:
 *
 *  1. **Atomic writes.** Every `put` lands in a temp file under the same directory, is fsync'd,
 *     and is then `rename`d into place. POSIX rename within one filesystem is atomic, so a pulled
 *     USB stick or a killed process leaves the previous object or the new one, never a truncated
 *     file that would pass the `stat` existence check and fail at restore.
 *  2. **Containment.** Names are ours, not a client's, but they are still joined onto a root, and
 *     the same traversal that hit `user_fileaccess.provider.fs.ts` would hit here. Shared check,
 *     one place: `base/storage_path.ts`.
 */
export class FsBackupTarget implements BackupTarget {
  readonly name = 'fs';

  constructor(private readonly root: string) {
    if (!root) {
      throw new Error('FsBackupTarget requires a root path (KND_BACKUP_PATH)');
    }
  }

  /** Object names are `/`-separated regardless of platform; split before resolving. */
  private resolve(name: string): string {
    const segments = String(name).split('/');
    return resolveWithinRoot(this.root, ...segments);
  }

  async put(name: string, data: Buffer | Readable): Promise<void> {
    const fullpath = this.resolve(name);
    const dir = path.dirname(fullpath);
    await fsp.mkdir(dir, {recursive: true});

    // The temp file must sit in the destination directory: rename is only atomic within one
    // filesystem, and a system temp dir is very often a different one — on the box it is tmpfs.
    const tmppath = path.join(dir, `.tmp-${randomUUID()}`);
    try {
      const handle = await fsp.open(tmppath, 'wx');
      try {
        if (Buffer.isBuffer(data)) {
          await handle.writeFile(data);
        } else {
          // Written chunk by chunk through the handle rather than through `pipeline` into
          // `handle.createWriteStream()`. That stream owns the handle: with `autoClose` on it
          // closes the fd and the `sync()` below throws EBADF, and with `autoClose` off it never
          // emits 'close' and `pipeline` waits forever. Awaiting each write keeps backpressure and
          // leaves the handle open for the fsync, which is the point of the whole method.
          for await (const chunk of data) {
            await handle.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
        }
        // Without this the rename can be durable while the bytes are not, which is precisely the
        // crash window that produces a present-but-empty blob.
        await handle.sync();
      } finally {
        await handle.close().catch(() => undefined);
      }
      await fsp.rename(tmppath, fullpath);
    } catch (e) {
      await fsp.rm(tmppath, {force: true}).catch(() => undefined);
      throw e;
    }
  }

  async get(name: string): Promise<Readable> {
    const fullpath = this.resolve(name);
    // Fail here rather than handing back a stream that emits ENOENT later, where callers reading
    // a bundle would see a truncated read instead of a missing object.
    await fsp.stat(fullpath);
    return fs.createReadStream(fullpath);
  }

  async stat(name: string): Promise<BackupObjectInfo | null> {
    const fullpath = this.resolve(name);
    try {
      const st = await fsp.stat(fullpath);
      if (!st.isFile()) return null;
      return {name, size: st.size, modifiedAt: st.mtime};
    } catch (e: any) {
      if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') return null;
      throw e;
    }
  }

  async *list(prefix: string): AsyncIterable<BackupObjectInfo> {
    // A prefix is a name prefix, not necessarily a directory: walk the deepest directory the
    // prefix fully names, then filter by the prefix itself.
    const normalized = String(prefix || '').replace(/^\/+/, '');
    const lastSlash = normalized.lastIndexOf('/');
    const dirPart = lastSlash === -1 ? '' : normalized.slice(0, lastSlash);

    let startDir: string;
    try {
      startDir = dirPart ? this.resolve(dirPart) : path.resolve(this.root);
    } catch {
      return;
    }

    for await (const entry of this.walk(startDir)) {
      const rel = path.relative(path.resolve(this.root), entry).split(path.sep).join('/');
      if (!rel.startsWith(normalized)) continue;
      const st = await fsp.stat(entry).catch(() => null);
      if (!st || !st.isFile()) continue;
      yield {name: rel, size: st.size, modifiedAt: st.mtime};
    }
  }

  private async *walk(dir: string): AsyncIterable<string> {
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, {withFileTypes: true});
    } catch (e: any) {
      if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') return;
      throw e;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* this.walk(full);
      } else if (entry.isFile()) {
        // A crashed `put` leaves one of these behind. It is not an object and must never be
        // reported as one, or garbage collection would count it and restore would try to read it.
        if (entry.name.startsWith('.tmp-')) continue;
        yield full;
      }
    }
  }

  async delete(name: string): Promise<void> {
    const fullpath = this.resolve(name);
    await fsp.rm(fullpath, {force: true});
  }
}
