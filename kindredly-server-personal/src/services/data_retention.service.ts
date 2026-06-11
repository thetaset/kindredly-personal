import {AuditLogRepo} from '@/db/audit_log.repo';
import {EventLogRepo} from '@/db/event_log.repo';
import {UserActivityLogRepo} from '@/db/user_activity_log.repo';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';

const MIN_SAFE_RETENTION_DAYS = 30;
const ACTIVITY_LOG_RETENTION_DAYS = 30;
const EXTENDED_LOG_RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PurgeTarget = {
  table: 'user_activity_log' | 'user_change_log' | 'audit_log' | 'event_log';
  retentionDays: number;
  repo: UserActivityLogRepo | UserChangeLogRepo | AuditLogRepo | EventLogRepo;
};

export class DataRetentionService {
  private static _staticInstance: DataRetentionService | null = null;

  static get instance(): DataRetentionService {
    if (!this._staticInstance) this._staticInstance = new DataRetentionService();
    return this._staticInstance;
  }

  private readonly userActivityLogRepo = new UserActivityLogRepo();
  private readonly userChangeLogRepo = new UserChangeLogRepo();
  private readonly auditLogRepo = new AuditLogRepo();
  private readonly eventLogRepo = new EventLogRepo();

  private assertRetentionDays(days: number, table: string) {
    if (!Number.isInteger(days) || days < MIN_SAFE_RETENTION_DAYS) {
      throw new Error(`[DataRetentionService] unsafe retention for ${table}: ${days}`);
    }
  }

  private buildCutoff(nowMs: number, retentionDays: number, table: string): Date {
    this.assertRetentionDays(retentionDays, table);
    const cutoffMs = nowMs - retentionDays * MS_PER_DAY;
    const cutoff = new Date(cutoffMs);
    if (!Number.isFinite(cutoff.getTime())) {
      throw new Error(`[DataRetentionService] invalid cutoff for ${table}`);
    }

    // Safety invariant: never allow purging newer than the 30-day floor.
    const maxAllowedCutoffMs = nowMs - MIN_SAFE_RETENTION_DAYS * MS_PER_DAY;
    if (cutoffMs > maxAllowedCutoffMs) {
      throw new Error(`[DataRetentionService] cutoff too recent for ${table}`);
    }
    if (cutoffMs >= nowMs) {
      throw new Error(`[DataRetentionService] cutoff in the future for ${table}`);
    }

    return cutoff;
  }

  private async deleteWithSafetyGuard(target: PurgeTarget, nowMs: number, minSafeCutoff: Date) {
    const retentionCutoff = this.buildCutoff(nowMs, target.retentionDays, target.table);

    // Dual-guard delete: match both intended retention cutoff and the global 30-day safety floor.
    // If retentionCutoff is ever wrong, this still prevents deleting records newer than 30 days.
    const deleted = await (
      target.repo.query().where('createdAt', '<', retentionCutoff).andWhere('createdAt', '<', minSafeCutoff) as any
    ).del();

    return {table: target.table, deleted: Number(deleted || 0)};
  }

  async runPurge() {
    const startedAt = Date.now();
    const nowMs = Date.now();
    const minSafeCutoff = this.buildCutoff(nowMs, MIN_SAFE_RETENTION_DAYS, 'global');

    const targets: PurgeTarget[] = [
      {table: 'user_activity_log', retentionDays: ACTIVITY_LOG_RETENTION_DAYS, repo: this.userActivityLogRepo},
      {table: 'user_change_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.userChangeLogRepo},
      {table: 'audit_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.auditLogRepo},
      {table: 'event_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.eventLogRepo},
    ];

    const results = [] as Array<{table: string; deleted: number}>;
    for (const target of targets) {
      const result = await this.deleteWithSafetyGuard(target, nowMs, minSafeCutoff);
      results.push(result);
    }

    const durationMs = Date.now() - startedAt;
    for (const result of results) {
      console.log('[DataRetentionService.runPurge]', result.table, 'deletedRows=', result.deleted);
    }
    console.log(
      '[DataRetentionService.runPurge] complete durationMs=',
      durationMs,
      'minSafeRetentionDays=',
      MIN_SAFE_RETENTION_DAYS,
    );

    return results;
  }
}
