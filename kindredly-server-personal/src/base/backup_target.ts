import {Readable} from 'stream';
import {config} from '@/config';
import {logger} from '@/utils/logger';

/**
 * Where a realm backup bundle is written, and nothing else.
 *
 * A backup target stores and retrieves **opaque named blobs**. It does not know what a realm is,
 * cannot read a bundle, and never runs application logic against family data — that is decision D2
 * in `docs/proposals/realm-backup-and-transfer.md`, and it is the whole reason a backup target is
 * safe to point at someone else's storage. Bytes in, bytes out.
 *
 * The names it is given come from `docs/proposals/realm-bundle-format.md` §2:
 *
 *   realms/<realmId>/snapshots/<snapshotId>.krb    the small encrypted half
 *   realms/<realmId>/blobs/<hh>/<sha256>           content-addressed, shared across snapshots
 *
 * Shaped after `base/email_transport.ts` and `base/runtime.factory.ts` — a lazily resolved,
 * config-driven factory with `require`d implementations, so a process never pulls in an SDK for a
 * target it is not using. The seam is the point: REALM-6's Drive and S3 adapters implement this
 * interface and nothing above them changes.
 */

export type BackupObjectInfo = {
  /** The name as given to `put`, not a filesystem path. */
  name: string;
  size: number;
  modifiedAt: Date;
};

export interface BackupTarget {
  /** Named so a failure log says which target failed, not just that one did. */
  readonly name: string;

  /**
   * Write `data` at `name`, replacing whatever was there.
   *
   * **Must be atomic.** A `put` interrupted by power loss, a pulled USB stick or a killed process
   * must leave either the old object or the new one — never a truncated file. A half-written blob
   * is worse than a missing one: it satisfies the `stat` check that decides whether to re-upload,
   * so the corruption survives every later backup run and is only discovered at restore.
   */
  put(name: string, data: Buffer | Readable): Promise<void>;

  /** Read an object back. Rejects if it does not exist. */
  get(name: string): Promise<Readable>;

  /**
   * Size and mtime, or `null` when the object is absent.
   *
   * This doubles as the existence check that makes backups incremental — a content-addressed blob
   * the target already holds is never uploaded again.
   */
  stat(name: string): Promise<BackupObjectInfo | null>;

  /**
   * Every object whose name starts with `prefix`, in no guaranteed order.
   *
   * An async iterable rather than an array because the S3 and Drive adapters page, and because a
   * shared target can hold far more objects than one family's. Callers that want a list can
   * collect it; callers doing presence checks or garbage collection should not have to.
   */
  list(prefix: string): AsyncIterable<BackupObjectInfo>;

  /** Remove an object. Absent is not an error — garbage collection re-runs. */
  delete(name: string): Promise<void>;
}

let target: BackupTarget | null = null;
let resolved = false;

/**
 * `KND_BACKUP_TARGET` selects the adapter. Unset means unconfigured, which is the normal state of
 * a box on first boot.
 */
function chooseTargetName(): string {
  return (process.env.KND_BACKUP_TARGET || config.backup.target || '').trim().toLowerCase();
}

/**
 * The configured backup target, or **`null` when none is configured**.
 *
 * Returning null rather than a no-op target is deliberate, and it is the lesson of LITE-27: an
 * `/account/export` that answered `{success: true}` over an empty method body told parents their
 * data was exported when nothing had happened. A backup that silently discards is the same defect
 * with worse consequences, because nobody looks at a backup until the day it is all they have.
 * Callers must handle null and say so out loud.
 */
export function getBackupTarget(): BackupTarget | null {
  if (!resolved) {
    const name = chooseTargetName();
    switch (name) {
      case '':
      case 'none':
        target = null;
        break;
      case 'fs':
      case 'local':
      case 'usb': {
        const {FsBackupTarget} = require('./backup_target.fs');
        target = new FsBackupTarget(config.backup.path);
        break;
      }
      default:
        // An unrecognised value must not fall through to a working target — that would write a
        // family's backup somewhere nobody chose. Unconfigured is the safe answer, and it is loud.
        logger.error(`KND_BACKUP_TARGET="${name}" is not a backup target; backups are disabled`);
        target = null;
    }
    // Set only after a successful resolution. If an adapter constructor throws — a missing
    // KND_BACKUP_PATH is the likely one — marking it resolved would turn a loud misconfiguration
    // into silently disabled backups from the second call onward.
    resolved = true;
    logger.info(`[backup] target: ${target ? target.name : 'none (backups disabled)'}`);
  }
  return target;
}

/** Forget the resolved target so the next call re-picks one. For tests and settings saves. */
export function resetBackupTarget(): void {
  target = null;
  resolved = false;
}
