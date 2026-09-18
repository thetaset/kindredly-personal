import {Readable} from 'stream';

import {BackupTarget, getBackupTarget} from '@/base/backup_target';
import {getUserFileAccessProvider} from '@/base/fileaccess.factory';
import {UserFileAccessProvider} from '@/base/user_fileaccess.provider';
import knex from '@/db/knex_config';
import {SyncType, UserChangeLogRepo} from '@/db/user_changelog.repo';
import {logger} from '@/utils/logger';
import {Knex} from 'knex';

import {BundleBlobEntry, BundleHeader, BundleManifest, BundleRecord, blobObjectName} from './bundle_format';
import {OpenedBundle, RealmBundleReader, VerifyLevel, VerifyReport} from './bundle_reader';
import {ClaimWindow, RealmClaimService} from './realm_claim.service';
import {REALM_TABLE_SCOPES, travels} from './realm_scope';

/**
 * Key ids, mirroring `CryptoUtils.keyFieldsToId` on the client. Duplicated rather than imported
 * because the two packages do not share crypto code, and asserted by a test so they cannot drift.
 */
export const userSecretKeyId = (userId: string) => `user:${userId}:sym_default.v0`;
export const recoveryKeyId = (userId: string) => `user:${userId}:sym_recovery.v0`;

/**
 * Putting a realm back — "Recover my family" (REALM-8).
 *
 * The inverse of `realm_backup.service.ts`, out of the same pieces and in the reverse direction:
 * the reader opens and checks, this writes records into a database and blobs into the file
 * provider. Until this existed the box wrote and verified bundles that **nothing could read
 * back**, which makes a backup a promise rather than a restore point.
 *
 * Three properties this file exists to hold:
 *
 * 1. **Nothing is written until the bundle has proved itself.** A wrong phrase, a future format
 *    version or a failed L3 verify all stop at preflight, with an empty database untouched.
 * 2. **Restore does not grant authority** (format §9). If the destination already holds this realm
 *    and any member's live revision is ahead of the bundle's, the restore refuses.
 * 3. **What could not be written is reported, never swallowed.** A restore that silently drops
 *    rows is the failure this whole line exists to avoid, and it would be discovered months later.
 *
 * The surface is the box's first boot: an empty database offers "Set up a new family" or "Recover
 * my family". No account exists yet — that is the point, and it is why nothing here takes a
 * `RequestContext`. The recovery phrase is the only credential in play, which is also the only
 * credential that *can* be in play: without it the bundle is opaque bytes.
 */

export type RestorableSnapshot = {
  objectName: string;
  realmId: string;
  snapshotId: string;
  createdAt: string;
  bundleFormatVersion: number;
  sizeBytes: number;
};

/** One member whose live history at the destination is ahead of the bundle's (§9). */
export type AheadMember = {userId: string; liveRevision: number; bundleRevision: number};

export type AuthorityCheck = {
  /** May this restore take authority for the realm? */
  ok: boolean;
  /** False on an empty box, which is the ordinary case and needs no comparison. */
  destinationHasRealm: boolean;
  ahead: AheadMember[];
};

export type RestorePreflight = {
  header: BundleHeader;
  manifest: BundleManifest;
  verify: VerifyReport;
  authority: AuthorityCheck;
  /** Whether this is the newest snapshot at the target — format §13 wants the date said out loud. */
  isLatest: boolean;
  memberCount: number;
  recordCount: number;
  blobCount: number;
  /** `manifest.excluded`, so the destination can tell the family what did not travel. */
  excluded: string[];
  unlockMethods: UnlockMethods;
};

export type SkippedRecord = {table: string; recordId: string; reason: string};

/**
 * Which members could still get back in, per KEY-11 D8 — "a move cannot leave a family with no way
 * in". *Unlock* (opening your own key envelope) and *sign in* (a host credential) are two different
 * ladders, and only the first survives a bundle. A member with neither has data at the destination
 * they can never reach.
 *
 * A passkey-wrapped envelope is deliberately not counted: `passkey_credential` travels, but each
 * row is bound to the rpId that registered it, so on a different host it is dead weight.
 */
export type UnlockMethods = {
  byPassword: string[];
  byRecoveryKey: string[];
  /** Members carrying neither. They need a guardian, as at account setup. */
  strandedMembers: string[];
  /** Nobody at all can get in. D8's blocker. */
  none: boolean;
};

export type RestoreReport = {
  realmId: string;
  snapshotId: string;
  createdAt: string;
  memberIds: string[];
  recordsWritten: number;
  recordsSkipped: SkippedRecord[];
  /** Columns in the bundle that this schema no longer has. Dropped, and named (format §10.2). */
  droppedColumns: string[];
  blobsWritten: number;
  blobsMissing: string[];
  excluded: string[];
  verify: VerifyReport;
  unlockMethods: UnlockMethods;
  /** Opened by this restore: how the restored members get a sign-in on this host (REALM-14). */
  claimWindow: ClaimWindow;
  /** True when the guardian was told nobody can get in and chose to restore anyway. */
  restoredWithoutUnlockMethod?: boolean;
};

export class RealmRestoreService {
  private static _instance: RealmRestoreService | null = null;

  static get instance(): RealmRestoreService {
    if (!this._instance) this._instance = new RealmRestoreService();
    return this._instance;
  }

  private readonly columns = new Map<string, Set<string>>();
  private readonly jsonColumns = new Map<string, Set<string>>();

  constructor(
    private readonly db: Knex = knex,
    private readonly files: UserFileAccessProvider = getUserFileAccessProvider(),
    private readonly changeLog = new UserChangeLogRepo(),
    private readonly claims = RealmClaimService.instance,
  ) {}

  /**
   * Every snapshot at the target, newest first, read from cleartext headers alone.
   *
   * No phrase is needed to *find* a bundle — only to open one — so a guardian sees which family
   * and which dates are on the stick before they are asked to type anything.
   *
   * The realm ids are not known in advance on a fresh box, so this walks the whole target rather
   * than one realm's snapshot prefix. That walk includes the blob tree, which is the large half:
   * acceptable because a restore happens once, and the alternative is a directory-listing method
   * that every future adapter would have to implement.
   */
  async listRestorable(target: BackupTarget | null = getBackupTarget()): Promise<RestorableSnapshot[]> {
    if (!target) return [];
    const reader = new RealmBundleReader(target);
    const found: RestorableSnapshot[] = [];

    for await (const info of target.list('realms/')) {
      if (!/^realms\/[^/]+\/snapshots\/[^/]+\.krb$/.test(info.name)) continue;
      try {
        const header = await reader.peek(info.name);
        found.push({
          objectName: info.name,
          realmId: header.realmId,
          snapshotId: header.snapshotId,
          createdAt: header.createdAt,
          bundleFormatVersion: header.bundleFormatVersion,
          sizeBytes: info.size,
        });
      } catch (e: any) {
        // One unreadable file must not hide the rest of a family's history.
        logger.warn(`[restore] ignoring ${info.name}: ${e?.message}`);
      }
    }

    return found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Everything a guardian needs to decide, with nothing written.
   *
   * Verifies at L3 — every blob re-hashed — because this is the one moment the cost is obviously
   * worth paying: the alternative is discovering a corrupt blob after it has been written over an
   * empty box, when there is no longer an "old state" to keep.
   */
  async preflight(
    objectName: string,
    phrase: string,
    target: BackupTarget | null = getBackupTarget(),
    level: VerifyLevel = VerifyLevel.BlobFull,
  ): Promise<RestorePreflight> {
    const reader = this.readerFor(target);

    // `open` is what rejects a wrong phrase and a future `bundleFormatVersion`, and it does so
    // before anything else runs.
    const opened = await reader.open(objectName, phrase);
    const verify = await reader.verify(objectName, phrase, level);
    const authority = await this.checkAuthority(opened.manifest);
    const latest = await reader.latestSnapshot(opened.manifest.realmId);

    return {
      header: opened.header,
      manifest: opened.manifest,
      verify,
      authority,
      isLatest: latest === objectName,
      memberCount: opened.manifest.memberCount,
      recordCount: opened.manifest.recordTypes.reduce((n, t) => n + t.count, 0),
      blobCount: opened.manifest.blobCount,
      excluded: opened.manifest.excluded ?? [],
      unlockMethods: this.unlockMethods(opened),
    };
  }

  /**
   * Read the surviving unlock methods out of the bundle itself, before anything is written.
   *
   * The envelopes are in the payload, so this needs no destination state — which is what lets a
   * restore refuse *before* it has half-written a realm nobody can open.
   */
  unlockMethods(opened: OpenedBundle): UnlockMethods {
    const members = (opened.records.get('user') ?? []).map((r) => r.recordId).filter(Boolean);
    const envelopes = opened.records.get('key_entry') ?? [];

    const byPassword: string[] = [];
    const byRecoveryKey: string[] = [];

    for (const userId of members) {
      const secretId = userSecretKeyId(userId);
      const mine = envelopes.filter((e) => {
        const data = e.data as Record<string, unknown>;
        return data?.selectId === userId && data?.keyId === secretId && !e.deletedAt;
      });
      const unwrappers = new Set(mine.map((e) => String((e.data as Record<string, unknown>)?.unwrappingKeyId ?? '')));
      if (unwrappers.has('userPassword')) byPassword.push(userId);
      if (unwrappers.has(recoveryKeyId(userId))) byRecoveryKey.push(userId);
    }

    const reachable = new Set([...byPassword, ...byRecoveryKey]);
    return {
      byPassword,
      byRecoveryKey,
      strandedMembers: members.filter((id) => !reachable.has(id)),
      none: reachable.size === 0,
    };
  }

  /**
   * Restore does not grant authority (format §9).
   *
   * Revision-only until SYNC-8 exists: a stale host that has been offline cannot be detected by
   * epoch, only by comparing revisions against a host that is reachable. That is a real limit and
   * the restore surface must not paper over it.
   */
  async checkAuthority(manifest: BundleManifest): Promise<AuthorityCheck> {
    const account = await this.db('account').where({_id: manifest.realmId}).first();
    if (!account) return {ok: true, destinationHasRealm: false, ahead: []};

    const ahead: AheadMember[] = [];
    for (const [userId, bundleRevision] of Object.entries(manifest.revisions ?? {})) {
      const liveRevision = await this.changeLog.maxRevisionForUser(userId);
      if (liveRevision > Number(bundleRevision)) {
        ahead.push({userId, liveRevision, bundleRevision: Number(bundleRevision)});
      }
    }
    return {ok: ahead.length === 0, destinationHasRealm: true, ahead};
  }

  /**
   * Write the realm.
   *
   * `allowUnverified` exists for the one case where refusing is worse than restoring: a family
   * whose only surviving snapshot has a fault still wants back everything that is intact. It is
   * never a default, it is recorded in the report, and a surface must make the guardian say it.
   */
  async restore(
    opts: {objectName: string; phrase: string; allowUnverified?: boolean; acceptNoUnlockMethod?: boolean},
    target: BackupTarget | null = getBackupTarget(),
  ): Promise<RestoreReport> {
    const reader = this.readerFor(target);
    const pre = await this.preflight(opts.objectName, opts.phrase, target);

    if (!pre.verify.ok && !opts.allowUnverified) {
      throw new Error(
        `This backup did not pass its own check, so nothing was restored: ${pre.verify.problems
          .map((p) => `${p.kind} (${p.detail})`)
          .join('; ')}`,
      );
    }
    if (!pre.authority.ok) {
      // The destination has newer history for someone. Overwriting it is exactly the data loss
      // §9 exists to prevent, and the family's answer is a fresh host, not this one.
      throw new Error(
        `This host already holds a newer copy of this family, so nothing was restored. ` +
          `${pre.authority.ahead.length} member(s) have changes the backup does not: ` +
          `${pre.authority.ahead.map((a) => `${a.userId} (live ${a.liveRevision} > backup ${a.bundleRevision})`).join(', ')}. ` +
          `Restore onto an empty host instead.`,
      );
    }

    if (pre.unlockMethods.none && !opts.acceptNoUnlockMethod) {
      // KEY-11 D8 as a blocker rather than a warning. Restoring a realm nobody can open produces a
      // box full of a family's data that the family cannot reach — worse than an honest refusal,
      // because it looks like it worked.
      //
      // Overridable, unlike D8's migration case, and the difference is the source: a migration can
      // refuse for free because the old host is still running, while here the old host is gone and
      // refusing outright may be the last word on that family's data. A guardian who is told
      // plainly may still want their photos back.
      throw new Error(
        'No member of this family can unlock their data at this destination: the backup carries no ' +
          'password-protected or recovery-key-protected key for anyone. Sign-in details never travel, ' +
          'so nobody would be able to get in. Restore anyway only if you understand that.',
      );
    }

    const opened = await reader.open(opts.objectName, opts.phrase);
    const {manifest} = opened;

    const dropped = new Set<string>();
    const skipped: SkippedRecord[] = [];
    let written = 0;

    // Account first, then members, then everything that references them: all foreign keys among
    // travelling tables point at `account` or `user`, and nothing else.
    written += await this.writeRealmRoot(opened, dropped, skipped);
    written += await this.writeTable('user', opened.records.get('user') ?? [], dropped, skipped);

    for (const table of [...opened.records.keys()].sort()) {
      if (table === 'user') continue;
      if (!travels(table)) {
        // A bundle naming a table this host classifies `host` or `derived` is a version skew, not
        // a row to write blindly into infrastructure.
        for (const record of opened.records.get(table) ?? []) {
          skipped.push({table, recordId: record.recordId, reason: 'this host does not import that table'});
        }
        continue;
      }
      written += await this.writeTable(table, opened.records.get(table) ?? [], dropped, skipped);
    }

    const memberIds = (opened.records.get('user') ?? []).map((r) => r.recordId).filter(Boolean);
    const blobs = await this.writeBlobs(manifest.realmId, opened.blobIndex, target!);

    // The destination's sync journal starts empty, so every client must be told to re-read
    // everything rather than continue from a cursor that belongs to a host that no longer exists
    // (format §4.2). `user_change_log` is `derived` and deliberately does not travel.
    if (memberIds.length) await this.changeLog.addChangeLogEntries(memberIds, {type: SyncType.fullReset});

    // Nothing that signs a member in travelled, so the last step of a restore is opening the door
    // they will come back through (REALM-14). The authority for that window is this restore, which
    // already proved the printed recovery phrase.
    const claimWindow = await this.claims.openWindow(manifest.realmId, manifest.snapshotId);

    logger.info(
      `[restore] ${manifest.realmId}: ${written} records, ${blobs.written} blobs, ` +
        `${skipped.length} rows skipped, ${blobs.missing.length} blobs missing`,
    );

    return {
      realmId: manifest.realmId,
      snapshotId: manifest.snapshotId,
      createdAt: manifest.createdAt,
      memberIds,
      recordsWritten: written,
      recordsSkipped: skipped,
      droppedColumns: [...dropped].sort(),
      blobsWritten: blobs.written,
      blobsMissing: blobs.missing,
      excluded: manifest.excluded ?? [],
      verify: pre.verify,
      unlockMethods: pre.unlockMethods,
      claimWindow,
      restoredWithoutUnlockMethod: pre.unlockMethods.none || undefined,
    };
  }

  private readerFor(target: BackupTarget | null): RealmBundleReader {
    if (!target) throw new Error('No backup target is configured, so there is nothing to restore from');
    return new RealmBundleReader(target);
  }

  /** `realm.json` is the `account` row, field-filtered on the way out (§4.4). */
  private async writeRealmRoot(opened: OpenedBundle, dropped: Set<string>, skipped: SkippedRecord[]): Promise<number> {
    const realm = (opened.realm ?? {}) as Record<string, unknown>;
    if (!realm._id) {
      skipped.push({table: 'account', recordId: opened.manifest.realmId, reason: 'bundle carries no realm root'});
      return 0;
    }
    return await this.writeTable(
      'account',
      [
        {
          realmId: opened.manifest.realmId,
          recordType: 'account',
          recordVersion: 1,
          recordId: String(realm._id),
          deletedAt: null,
          data: realm,
        },
      ],
      dropped,
      skipped,
    );
  }

  /**
   * One table, one transaction.
   *
   * Rows are inserted in batches; a batch that fails is retried row by row so that one bad row
   * costs one row rather than the table. The realistic cause is a foreign key to a member who is
   * not in this realm — `user_perm.sharedByUserId` can name a curator from another family — and
   * losing a whole table of permissions to that would be far worse than losing the one row.
   */
  private async writeTable(
    table: string,
    records: BundleRecord[],
    dropped: Set<string>,
    skipped: SkippedRecord[],
    batchSize = 200,
  ): Promise<number> {
    if (!records.length) return 0;

    const columns = await this.columnsFor(table);
    if (!columns.size) {
      for (const record of records) {
        skipped.push({table, recordId: record.recordId, reason: 'no such table on this host'});
      }
      return 0;
    }

    const rows = records.map((r) => this.toRow(table, r, columns, dropped));
    let written = 0;

    await this.db.transaction(async (trx) => {
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        try {
          // The batch runs inside its own SAVEPOINT, not directly on `trx`.
          //
          // Postgres aborts the whole transaction on any error, so a batch inserted directly would
          // poison it: the row-by-row retry below would then fail with "current transaction is
          // aborted" for every remaining row, and — worse — that message would be recorded as the
          // reason, hiding the one real error that started it. Rolling back to a savepoint leaves
          // the outer transaction usable and lets the retry report the truth.
          await trx.transaction(async (savepoint) => {
            await savepoint(table).insert(batch);
          });
          written += batch.length;
        } catch {
          for (let j = 0; j < batch.length; j++) {
            try {
              await trx.transaction(async (savepoint) => {
                await savepoint(table).insert(batch[j]);
              });
              written += 1;
            } catch (e: any) {
              skipped.push({table, recordId: records[i + j].recordId, reason: String(e?.message ?? e)});
            }
          }
        }
      }
    });

    return written;
  }

  /**
   * A bundle row as this schema's columns.
   *
   * Two coercions, both required and neither cosmetic:
   *
   * - **Unknown columns are dropped and named.** Format §10.2 promises every released version stays
   *   readable forever, and a column removed since the snapshot was written would otherwise make
   *   the whole restore fail on `column does not exist`.
   * - **`json`/`jsonb` values are stringified.** `node-pg` renders a JS array as a Postgres array
   *   literal, so a jsonb column holding an array — `keyOps`, `kinds` — would be written as
   *   `{a,b}` instead of `["a","b"]`, or rejected. Which columns are JSON is asked of the schema
   *   rather than listed here, for the same reason the extractor asks for its id column: a
   *   hardcoded list goes stale the next time a table gains one.
   */
  private toRow(
    table: string,
    record: BundleRecord,
    columns: Set<string>,
    dropped: Set<string>,
  ): Record<string, unknown> {
    const json = this.jsonColumns.get(table) ?? new Set<string>();
    const row: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record.data ?? {})) {
      if (!columns.has(key)) {
        dropped.add(`${table}.${key}`);
        continue;
      }
      row[key] = json.has(key) && value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    }
    return row;
  }

  /** Cached per process, one `information_schema` read per table. */
  private async columnsFor(table: string): Promise<Set<string>> {
    let known = this.columns.get(table);
    if (known) return known;

    const rows: Array<{column_name: string; data_type: string}> = await this.db('information_schema.columns')
      .where({table_schema: 'public', table_name: table})
      .select('column_name', 'data_type');

    known = new Set(rows.map((r) => r.column_name));
    this.columns.set(table, known);
    this.jsonColumns.set(
      table,
      new Set(rows.filter((r) => r.data_type === 'json' || r.data_type === 'jsonb').map((r) => r.column_name)),
    );
    return known;
  }

  /**
   * Every blob the index names, written back where the database expects to find it.
   *
   * Chunked parents carry `chunkHashes` and no object of their own — their parts are separate
   * index entries and are the only bytes on disk (format §6.2). Writing a base object for one
   * would create a file the reader never expects and the chunk assembler would ignore.
   */
  private async writeBlobs(
    realmId: string,
    blobIndex: BundleBlobEntry[],
    target: BackupTarget,
  ): Promise<{written: number; missing: string[]}> {
    let written = 0;
    const missing: string[] = [];

    for (const entry of blobIndex) {
      if (!entry.blobId) continue; // a chunked parent: its parts carry the bytes
      const filename = entry.ref?.filename;
      if (!filename) {
        missing.push(`${entry.blobId} (index entry names no destination)`);
        continue;
      }

      let bytes: Buffer;
      try {
        bytes = await readStream(await target.get(blobObjectName(realmId, entry.blobId)));
      } catch {
        // Preflight verified presence, so reaching here means the target changed underneath us.
        missing.push(entry.blobId);
        continue;
      }

      try {
        if (entry.namespace === 'userFile') {
          await this.files.uploadUserFileBytes(bytes, entry.ref!.refType, entry.ref!.refId, filename);
        } else {
          // The image seam takes base64, not a Buffer — see `saveURLDatatoFile`.
          await this.files.uploadImageDirect(bytes.toString('base64'), filename);
        }
        written += 1;
      } catch (e: any) {
        missing.push(`${entry.blobId} (${e?.message ?? e})`);
      }
    }

    return {written, missing};
  }
}

async function readStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** Exported for the conformance test: the restore must know every table the export can produce. */
export const IMPORTABLE_TABLES = Object.keys(REALM_TABLE_SCOPES).filter(travels);
