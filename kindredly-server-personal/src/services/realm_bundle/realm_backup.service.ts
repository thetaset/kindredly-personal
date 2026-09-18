import crypto from 'crypto';

import knex from '@/db/knex_config';
import {Knex} from 'knex';
import {BackupTarget, getBackupTarget} from '@/base/backup_target';
import {getUserFileAccessProvider} from '@/base/fileaccess.factory';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {logger} from '@/utils/logger';
import {config} from '@/config';

import {BlobHashCache} from './blob_hash_cache';
import {BundleHeader, BundleKeyring, snapshotObjectName} from './bundle_format';
import {RealmBundleReader, VerifyLevel, VerifyProblem, VerifyReport} from './bundle_reader';
import {RealmBundleWriter} from './bundle_writer';
import {RealmBlobs} from './realm_blobs';
import {RealmExtractor} from './realm_extractor';
import {EXCLUDED_MANIFEST_ENTRIES} from './realm_scope';

/**
 * The scheduled backup, and the box proving its own backups work.
 *
 * Composes the pieces rather than knowing any of their internals: the extractor walks, the blob
 * enumerator lists, the writer encrypts, the target stores, the reader verifies.
 *
 * **Key material follows KEY-11 D11.** The box persists a `BundleKeyring` — a realm salt and a
 * derived backup key — and never the recovery phrase. The phrase is generated once at setup,
 * returned to the caller to print, and then unrecoverable from this host. That is deliberate: the
 * phrase also derives KEY-1's recovery-kit key, and a box that held it would put the recovery kit
 * on the same disk as the backups.
 *
 * The keyring lives in `sys_info`, which `realm_scope.ts` classifies `host` — so the key that
 * protects a bundle is never inside that bundle.
 */

export const backupKeyringId = (realmId: string) => `backup_keyring_${realmId}`;
export const backupStateId = (realmId: string) => `backup_state_${realmId}`;

export type BackupState = {
  realmId: string;
  lastBackupAt?: string;
  lastSnapshotId?: string;
  lastBackupError?: string;
  blobsUploaded?: number;
  blobsSkipped?: number;
  /** Blobs that had to be read and hashed. On a settled realm this should be zero (REALM-7). */
  blobsHashed?: number;
  lastVerifiedAt?: string;
  /** Which level. A date alone invites the reader to assume the strongest check ran. */
  lastVerifiedLevel?: VerifyLevel;
  lastVerifyOk?: boolean;
  lastVerifyProblems?: string[];
  /**
   * When the backup key was last replaced (REALM-10). Snapshots older than this open only with
   * the previous printed sheet, and without this date that failure is indistinguishable from
   * corruption — GCM cannot tell a wrong key from altered bytes.
   */
  keyRotatedAt?: string;
  /**
   * The first snapshot written under the current key. Until one exists, the newest snapshot at
   * the target still belongs to the old key, which is the whole reason a rotation looks like a
   * fault to `verifyLatest`.
   */
  firstSnapshotUnderCurrentKey?: string;
};

export type EnableBackupResult =
  | {enabled: true; recoveryPhrase: string}
  /** Already on. No phrase, and nothing changed — re-keying is `rotateBackupKey`. */
  | {enabled: false; alreadyEnabled: true};

export type BackupRunResult = {
  realmId: string;
  ok: boolean;
  snapshotId?: string;
  blobsUploaded?: number;
  blobsSkipped?: number;
  blobsHashed?: number;
  error?: string;
};

/**
 * KEY-1's shape: 128 bits in Crockford Base32, grouped in fives, no confusable characters. The
 * printed artifact is KEY-1's job; this is the value that goes on it.
 */
export function generateRecoveryPhrase(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = crypto.randomBytes(16);
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(acc >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(acc << (5 - bits)) & 31];
  return (out.match(/.{1,5}/g) ?? []).join('-');
}

export class RealmBackupService {
  private static _instance: RealmBackupService | null = null;

  static get instance(): RealmBackupService {
    if (!this._instance) this._instance = new RealmBackupService();
    return this._instance;
  }

  constructor(
    private readonly db: Knex = knex,
    private readonly sysInfo = new SysInfoRepo(),
  ) {}

  /**
   * Turn backup on for a realm and return the phrase **once**.
   *
   * The caller must show it to the guardian; nothing here can produce it again. That is the honest
   * cost D10 already accepted — a lost phrase is a dead backup — and it is why KEY-1 chose a
   * printed sheet over a file download.
   *
   * **Refuses when a keyring already exists** (REALM-10). `SysInfoRepo.create` is an upsert, so
   * this method used to re-key on a second call: it minted a fresh salt and key, returned a new
   * phrase, and left every existing snapshot openable only with the old printed sheet. Nothing
   * said so. `verifyLatest` then failed with "wrong recovery phrase, or the file has been
   * altered", which reads as corruption on the one day a family is looking at this screen. An
   * "Enable backup" button wired to that is a trap, which is why the guardian surface waited for
   * this. Replacing the key is now `rotateBackupKey`, whose name says what it does.
   */
  async enableBackup(realmId: string): Promise<EnableBackupResult> {
    if (await this.getKeyring(realmId)) return {enabled: false, alreadyEnabled: true};

    const phrase = generateRecoveryPhrase();
    const keyring = BundleKeyring.newForRealm(phrase);
    await this.sysInfo.create({_id: backupKeyringId(realmId), data: keyring.toStored() as any});
    return {enabled: true, recoveryPhrase: phrase};
  }

  /**
   * Replace the backup key and return the new phrase, once.
   *
   * Deliberately a separate verb rather than a flag on `enableBackup`: the cost of doing this is
   * that every snapshot already at the target becomes unopenable with the new sheet, and a
   * caller has to mean it. Existing snapshots are left in place — they are still valid restore
   * points for anyone holding the previous sheet, and deleting a family's history because they
   * rotated a key would be the worse failure.
   *
   * The rotation date is recorded so `verifyLatest` and the guardian summary can say "snapshots
   * before <date> need the previous sheet" instead of reporting damage.
   */
  async rotateBackupKey(realmId: string): Promise<{recoveryPhrase: string; rotatedAt: string}> {
    if (!(await this.getKeyring(realmId))) {
      throw new Error('Backup is not enabled for this realm; use enableBackup');
    }

    const phrase = generateRecoveryPhrase();
    const keyring = BundleKeyring.newForRealm(phrase);
    const rotatedAt = new Date().toISOString();
    await this.sysInfo.create({_id: backupKeyringId(realmId), data: keyring.toStored() as any});
    // Cleared, not carried: the next successful run fills it, and until then the newest snapshot
    // at the target is one this key cannot open.
    await this.mergeState(realmId, {keyRotatedAt: rotatedAt, firstSnapshotUnderCurrentKey: undefined});
    return {recoveryPhrase: phrase, rotatedAt};
  }

  async getKeyring(realmId: string): Promise<BundleKeyring | null> {
    const row = await this.sysInfo.findById(backupKeyringId(realmId));
    const stored = row?.data as {salt: string; key: string} | undefined;
    return stored?.salt && stored?.key ? BundleKeyring.fromStored(stored) : null;
  }

  async getState(realmId: string): Promise<BackupState | null> {
    const row = await this.sysInfo.findById(backupStateId(realmId));
    return (row?.data as BackupState) ?? null;
  }

  private async mergeState(realmId: string, patch: Partial<BackupState>): Promise<void> {
    const current = (await this.getState(realmId)) ?? {realmId};
    await this.sysInfo.create({_id: backupStateId(realmId), data: {...current, ...patch, realmId} as any});
  }

  /** Every realm this host is the writer for. On a box that is one; the loop is not an assumption. */
  async realmsToBackUp(): Promise<string[]> {
    const rows = await this.db('account').whereNot({deleted: true}).select('_id');
    const realmIds = rows.map((r: {_id: string}) => r._id);
    const enabled: string[] = [];
    for (const realmId of realmIds) {
      if (await this.getKeyring(realmId)) enabled.push(realmId);
    }
    return enabled;
  }

  /**
   * The scheduled entry point.
   *
   * Returns per-realm results rather than throwing, so one realm's failure does not skip the rest —
   * and records the failure in state, because a backup that fails silently is the defect this whole
   * line exists to avoid.
   */
  async runScheduledBackup(): Promise<BackupRunResult[]> {
    const target = getBackupTarget();
    if (!target) {
      logger.info('[backup] no target configured; skipping scheduled backup');
      return [];
    }
    const results: BackupRunResult[] = [];
    for (const realmId of await this.realmsToBackUp()) {
      results.push(await this.backupRealm(realmId, target));
      await this.verifyLatest(realmId, VerifyLevel.BlobSample, target).catch((e) =>
        logger.error(`[backup] verify failed for ${realmId}: ${e?.message}`),
      );
    }
    return results;
  }

  async backupRealm(realmId: string, target: BackupTarget | null = getBackupTarget()): Promise<BackupRunResult> {
    if (!target) return {realmId, ok: false, error: 'No backup target configured'};

    const keyring = await this.getKeyring(realmId);
    if (!keyring) return {realmId, ok: false, error: 'Backup is not enabled for this realm'};

    try {
      const extractor = new RealmExtractor(this.db);
      const realm = await extractor.openRealm(realmId);

      const writer = new RealmBundleWriter({
        target,
        realmId,
        keyring,
        producer: {
          app: 'kindredly-server',
          version: String(config.version?.serverVersion ?? 'unknown'),
          profile: config.profile,
        },
      });
      writer.setRealm(realm.realm);
      writer.setRevisions(realm.revisions);
      writer.setExcluded(EXCLUDED_MANIFEST_ENTRIES);

      for await (const {table, record} of extractor.records(realm)) {
        writer.addRecord(table, record.recordVersion, record);
      }

      const hashCache = new BlobHashCache(this.sysInfo, this.db);
      await hashCache.load();
      const blobs = new RealmBlobs(this.db, getUserFileAccessProvider(), hashCache);
      const hashByFilename = new Map<string, string>();
      for await (const source of blobs.sources(realm)) {
        if ('chunkedParent' in source) {
          // The parent is recorded after its parts, so their hashes are known by now.
          const parent = source.chunkedParent;
          writer.addChunkedParent(
            parent.entry,
            parent.chunkFilenames.map((f) => hashByFilename.get(`${parent.refType}/${parent.refId}/${f}`) ?? ''),
          );
          continue;
        }
        // Cache the size the writer actually computed. Reusing `source.knownSize` here would
        // store 0 for a freshly hashed blob, and the next run would then see a size mismatch
        // against the target and re-upload every blob it had just learned the hash of.
        const {hash, size} = await writer.addBlob(source);
        if (source.cacheToken) hashCache.set(source.cacheToken, {hash, size});
        const ref = source.entry.ref;
        if (ref?.filename) hashByFilename.set(`${ref.refType}/${ref.refId}/${ref.filename}`, hash);
      }

      const {manifest, uploaded, skipped, hashed} = await writer.finish();
      // Sweep before persisting: without it the cache keeps an entry for every deleted file and
      // every superseded version, and on an appliance that is a row that only grows.
      await hashCache.flush(blobs.seenTokens);
      const priorState = await this.getState(realmId);
      await this.mergeState(realmId, {
        lastBackupAt: manifest.createdAt,
        lastSnapshotId: manifest.snapshotId,
        lastBackupError: undefined,
        blobsUploaded: uploaded,
        blobsSkipped: skipped,
        blobsHashed: hashed,
        // Only the first one after a rotation. Overwriting it every run would lose the boundary
        // that tells a pre-rotation snapshot apart from a damaged one.
        firstSnapshotUnderCurrentKey: priorState?.firstSnapshotUnderCurrentKey ?? manifest.snapshotId,
      });
      logger.info(
        `[backup] ${realmId}: snapshot ${manifest.snapshotId}, ${uploaded} uploaded, ${skipped} skipped, ${hashed} hashed`,
      );
      return {
        realmId,
        ok: true,
        snapshotId: manifest.snapshotId,
        blobsUploaded: uploaded,
        blobsSkipped: skipped,
        blobsHashed: hashed,
      };
    } catch (e: any) {
      const error = String(e?.message ?? e);
      // Recorded, not swallowed. Silence must never read as success.
      await this.mergeState(realmId, {lastBackupError: error});
      logger.error(`[backup] ${realmId} failed: ${error}`);
      return {realmId, ok: false, error};
    }
  }

  /**
   * Open the latest bundle and check it, which is the only honest way to know a backup works.
   * The level is recorded with the date — see `BackupState.lastVerifiedLevel`.
   */
  async verifyLatest(
    realmId: string,
    level: VerifyLevel = VerifyLevel.BlobSample,
    target: BackupTarget | null = getBackupTarget(),
  ): Promise<VerifyReport | null> {
    if (!target) return null;
    const keyring = await this.getKeyring(realmId);
    if (!keyring) return null;

    const reader = new RealmBundleReader(target);
    const latest = await reader.latestSnapshot(realmId);
    if (!latest) return null;

    let report: VerifyReport;
    try {
      report = await reader.verify(latest, keyring, level);
    } catch (e: any) {
      // A snapshot written before the key changed does not open with today's keyring, and GCM
      // cannot tell that apart from tampering — so the reader's message says both. The header is
      // cleartext, so the date can tell them apart, and "you need the previous sheet" is a
      // different instruction to a guardian than "your backup is damaged" (REALM-10).
      const rekeyed = await this.rekeyReport(realmId, latest, reader, level);
      if (!rekeyed) throw e;
      report = rekeyed;
    }

    await this.mergeState(realmId, {
      lastVerifiedAt: new Date().toISOString(),
      lastVerifiedLevel: level,
      lastVerifyOk: report.ok,
      lastVerifyProblems: report.problems.map((p) => `${p.kind}: ${p.detail}`),
    });
    return report;
  }

  /**
   * Was this snapshot written before the current key existed? Null when there has been no
   * rotation, or when the snapshot post-dates it — in which case the failure is a real one and
   * must reach the caller unchanged.
   */
  private async rekeyReport(
    realmId: string,
    objectName: string,
    reader: RealmBundleReader,
    level: VerifyLevel,
  ): Promise<VerifyReport | null> {
    const state = await this.getState(realmId);
    if (!state?.keyRotatedAt) return null;

    let header: BundleHeader;
    try {
      header = await reader.peek(objectName);
    } catch {
      // Not even the cleartext header parses, so this is not a key problem.
      return null;
    }
    // `<=`, not `<`: a snapshot written in the same millisecond as the rotation is the old key's,
    // because the rotation persists before any run can start. Strict `<` would flake there and
    // report the re-key as damage.
    if (!(new Date(header.createdAt) <= new Date(state.keyRotatedAt))) return null;

    const problem: VerifyProblem = {
      kind: 'key-rotated',
      detail:
        `written ${header.createdAt}, before the backup key changed on ${state.keyRotatedAt}; ` +
        'it opens with the previous recovery sheet',
    };
    return {
      ok: false,
      level,
      snapshotId: header.snapshotId,
      realmId: header.realmId,
      createdAt: header.createdAt,
      recordCount: 0,
      blobCount: 0,
      blobsChecked: 0,
      blobsHashed: 0,
      problems: [problem],
      durationMs: 0,
    };
  }

  /** What a guardian-facing surface renders. Null when backup was never turned on. */
  async guardianSummary(realmId: string): Promise<{
    enabled: boolean;
    lastBackupAt?: string;
    lastVerifiedAt?: string;
    lastVerifiedLevel?: VerifyLevel;
    healthy: boolean;
    problem?: string;
    /** Set once the key has been replaced, so a surface can explain the older sheet. */
    keyRotatedAt?: string;
    /**
     * True between a rotation and the next successful run. The newest snapshot is still the old
     * key's, so verify cannot open it — expected, not a fault, and the two must not render alike.
     */
    awaitingSnapshotAfterKeyChange?: boolean;
  } | null> {
    const enabled = !!(await this.getKeyring(realmId));
    if (!enabled) return {enabled: false, healthy: false, problem: 'Backup is not set up'};
    const state = await this.getState(realmId);
    if (!state?.lastBackupAt) return {enabled: true, healthy: false, problem: 'No backup has run yet'};

    // A rotation with no run behind it yet is a known, self-clearing state. Reporting the reader's
    // "wrong recovery phrase, or the file has been altered" here would tell a guardian their
    // backup is damaged on the day they deliberately changed the key (REALM-10).
    const awaitingSnapshotAfterKeyChange = !!state.keyRotatedAt && !state.firstSnapshotUnderCurrentKey;

    const verifyProblem = state.lastVerifyOk === false ? state.lastVerifyProblems?.[0] : undefined;
    const problem = awaitingSnapshotAfterKeyChange
      ? (state.lastBackupError ??
        `The backup key changed on ${state.keyRotatedAt}. Snapshots written before then need the previous recovery sheet; the next scheduled run writes one under the new key.`)
      : (state.lastBackupError ?? verifyProblem);

    return {
      enabled: true,
      lastBackupAt: state.lastBackupAt,
      lastVerifiedAt: state.lastVerifiedAt,
      lastVerifiedLevel: state.lastVerifiedLevel,
      healthy: !state.lastBackupError && state.lastVerifyOk === true,
      problem,
      keyRotatedAt: state.keyRotatedAt,
      awaitingSnapshotAfterKeyChange: awaitingSnapshotAfterKeyChange || undefined,
    };
  }

  /** Where a snapshot for this realm would live, for a restore UI that has not opened anything yet. */
  snapshotName(realmId: string, snapshotId: string): string {
    return snapshotObjectName(realmId, snapshotId);
  }
}
