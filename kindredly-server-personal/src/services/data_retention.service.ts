import {AuditLogRepo} from '@/db/audit_log.repo';
import {ClassificationDatasetSampleRepo} from '@/db/classification_dataset_sample.repo';
import {EventLogRepo} from '@/db/event_log.repo';
import {SecurityEventRepo} from '@/db/security_event.repo';
import {UserActivityRepo} from '@/db/user_activity.repo';
import {UserActivityLogRepo} from '@/db/user_activity_log.repo';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';
import {UserRepo} from '@/db/user.repo';
import {HISTORY_RETENTION_CHOICES, effectiveHistoryRetentionDays} from 'tset-sharedlib/plan-policy';

/** The floor for the system logs below. Activity history has its own rule: `purgeActivityHistory`. */
const MIN_SAFE_RETENTION_DAYS = 30;
/**
 * Also read by SyncService, which has to know how far back a sync cursor can point
 * before the rows behind it may have been deleted out from under it (SYNC-9). Shared
 * rather than duplicated: if these two ever disagree, the sync gap check is silently
 * wrong in whichever direction the drift went.
 */
export const EXTENDED_LOG_RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Contributed classifier samples. Longer than the activity log because a
 * training set is only useful if it accumulates, but bounded rather than kept
 * forever — the classification tables previously had no expiry at all.
 */
const CLASSIFICATION_SAMPLE_RETENTION_DAYS = 180;

/**
 * An activity record is one device's day: its `createdAt` is when that day's record started, and
 * entries in it can be up to a day newer (`tset-client/src/utils/usage.ts`). So a person keeping N
 * days has records deleted only once they are N + 1 days old, and "Keep history for 1 day" never
 * takes today's record.
 */
const ACTIVITY_RECORD_SPAN_DAYS = 1;

/** Nothing newer than this is ever deleted from activity history, whatever any setting says. */
const ACTIVITY_FLOOR_DAYS = HISTORY_RETENTION_CHOICES[0] + ACTIVITY_RECORD_SPAN_DAYS;

/**
 * The row that records when a person last cleared their history (`activity.service.ts`). Its
 * `createdAt` is the clear time, and devices compare their records against it, so it must outlive
 * any purge. The old 30-day purge deleted it with everything else.
 */
const ACTIVITY_CONTROL_TYPE = 'activity_control';

/** How many people a purge reads, and deletes for, at a time. */
const PEOPLE_PAGE_SIZE = 500;

type PurgeTarget = {
  table: 'user_change_log' | 'audit_log' | 'event_log' | 'security_event' | 'classification_dataset_sample';
  retentionDays: number;
  repo: UserChangeLogRepo | AuditLogRepo | EventLogRepo | SecurityEventRepo | ClassificationDatasetSampleRepo;
};

export class DataRetentionService {
  private static _staticInstance: DataRetentionService | null = null;

  static get instance(): DataRetentionService {
    if (!this._staticInstance) this._staticInstance = new DataRetentionService();
    return this._staticInstance;
  }

  private readonly userRepo = new UserRepo();
  private readonly userActivityLogRepo = new UserActivityLogRepo();
  private readonly userActivityRepo = new UserActivityRepo();
  private readonly userChangeLogRepo = new UserChangeLogRepo();
  private readonly auditLogRepo = new AuditLogRepo();
  private readonly eventLogRepo = new EventLogRepo();
  private readonly securityEventRepo = new SecurityEventRepo();
  private readonly classificationDatasetSampleRepo = new ClassificationDatasetSampleRepo();

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

  /**
   * The cutoff for a person keeping `days` of history. Throws, stopping the whole purge, on anything
   * that is not a "Keep history for" choice or that would reach inside the activity floor: a purge
   * that deletes nothing today is recoverable, and one that deletes the wrong history is not.
   */
  private activityCutoff(nowMs: number, days: number): Date {
    if (!Number.isInteger(days) || !(HISTORY_RETENTION_CHOICES as readonly number[]).includes(days)) {
      throw new Error(`[DataRetentionService] not a history retention choice: ${days}`);
    }
    const cutoffMs = nowMs - (days + ACTIVITY_RECORD_SPAN_DAYS) * MS_PER_DAY;
    if (!Number.isFinite(cutoffMs) || cutoffMs > nowMs - ACTIVITY_FLOOR_DAYS * MS_PER_DAY) {
      throw new Error(`[DataRetentionService] activity cutoff too recent for ${days} days`);
    }
    return new Date(cutoffMs);
  }

  /**
   * Activity history, per person (founder decision 2026-09-15, PLN-9): each person's records older
   * than their "Keep history for" setting, capped at their plan's maximum, 14 days when unset.
   *
   * Every delete is bounded twice, by that person's cutoff and by the independent activity floor,
   * so a wrong cutoff still cannot reach today's or yesterday's records. The row recording when a
   * person cleared their history is never deleted. Records whose person no longer exists get the
   * default. `user_activity`, the table being phased out, follows the same rule.
   */
  async purgeActivityHistory(nowMs: number = Date.now()) {
    const floorCutoff = new Date(nowMs - ACTIVITY_FLOOR_DAYS * MS_PER_DAY);
    const deleted = {user_activity_log: 0, user_activity: 0};

    const deleteFor = async (days: number, scope: (query: any, table: string) => any) => {
      const cutoff = this.activityCutoff(nowMs, days);
      const log = scope(this.userActivityLogRepo.query(), 'user_activity_log')
        .where('createdAt', '<', cutoff)
        .andWhere('createdAt', '<', floorCutoff)
        .andWhere((q: any) => q.whereNull('type').orWhereNot('type', ACTIVITY_CONTROL_TYPE));
      deleted.user_activity_log += Number((await log.del()) || 0);
      const legacy = scope(this.userActivityRepo.query(), 'user_activity')
        .where('createdAt', '<', cutoff)
        .andWhere('createdAt', '<', floorCutoff);
      deleted.user_activity += Number((await legacy.del()) || 0);
    };

    let afterId = '';
    for (;;) {
      const people: Array<{_id: string; historyRetentionDays: unknown; accountType: string | null}> =
        await this.userRepo
          .query()
          .leftJoin('account', 'account._id', 'user.accountId')
          .where('user._id', '>', afterId)
          .orderBy('user._id')
          .limit(PEOPLE_PAGE_SIZE)
          .select(
            'user._id',
            'account.accountType as accountType',
            this.userRepo.knex.raw(`"user".options->'historyRetentionDays' as "historyRetentionDays"`),
          );
      if (!people.length) break;
      afterId = people[people.length - 1]._id;

      const byDays = new Map<number, string[]>();
      for (const person of people) {
        const days = effectiveHistoryRetentionDays(person.accountType, person.historyRetentionDays);
        if (!byDays.has(days)) byDays.set(days, []);
        byDays.get(days)!.push(person._id);
      }
      for (const [days, userIds] of byDays) {
        await deleteFor(days, (query) => query.whereIn('userId', userIds));
      }
      if (people.length < PEOPLE_PAGE_SIZE) break;
    }

    // Records of a person who no longer exists: the default, like anyone who never chose.
    const knex = this.userRepo.knex;
    await deleteFor(effectiveHistoryRetentionDays('standard', null), (query, table) =>
      query.whereNotExists(function (this: any) {
        this.select(knex.raw('1')).from('user').whereRaw(`"user"._id = "${table}"."userId"`);
      }),
    );

    return [
      {table: 'user_activity_log', deleted: deleted.user_activity_log},
      {table: 'user_activity', deleted: deleted.user_activity},
    ];
  }

  async runPurge() {
    const startedAt = Date.now();
    const nowMs = Date.now();
    const minSafeCutoff = this.buildCutoff(nowMs, MIN_SAFE_RETENTION_DAYS, 'global');

    const targets: PurgeTarget[] = [
      {table: 'user_change_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.userChangeLogRepo},
      {table: 'audit_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.auditLogRepo},
      {table: 'event_log', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.eventLogRepo},
      {table: 'security_event', retentionDays: EXTENDED_LOG_RETENTION_DAYS, repo: this.securityEventRepo},
      {
        table: 'classification_dataset_sample',
        retentionDays: CLASSIFICATION_SAMPLE_RETENTION_DAYS,
        repo: this.classificationDatasetSampleRepo,
      },
    ];

    const results = [...(await this.purgeActivityHistory(nowMs))] as Array<{table: string; deleted: number}>;
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
      'activityFloorDays=',
      ACTIVITY_FLOOR_DAYS,
    );

    return results;
  }
}
