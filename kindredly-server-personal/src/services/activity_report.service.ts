import {RequestContext} from '@/base/request_context';
import knex from '@/db/knex_config';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {UserPrefKeys, UserPrefRepo} from '@/db/user_pref.repo';
import {container} from '@/inversify.config';
import {NotificationType, RequestTypes} from '@/typing/enum_strings';
import {logger} from '@/utils/logger';
import {escapeHtml} from '@/utils/text_utils';
import {
  dateKeyInTimeZone,
  dayOfWeekInTimeZone,
  timeZoneOffsetMinutes,
} from 'tset-sharedlib/deviceguard/compileDeviceSettings';
import {userPrefDefaults} from 'tset-sharedlib/schemas/public/UserPref';
import {UserType} from 'tset-sharedlib/shared.types';
import {isValidTimeZone} from './device_settings.service';
import NotificationService from './notification.service';

/** How often an admin gets the report. Missing or unknown reads as weekly. */
export type ActivityReportFrequency = 'weekly' | 'daily' | 'off';
export type ActivityReportPeriod = Exclude<ActivityReportFrequency, 'off'>;

/** The last report sent to one admin: its family-local date, when, and how often it was then. */
export type ActivityReportSent = {dateKey: string; sentAtMs: number; frequency?: ActivityReportPeriod};

/** Sent from 7 PM in the family's timezone. */
export const ACTIVITY_REPORT_HOUR = 19;

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIODS: Record<ActivityReportPeriod, {ms: number; days: number; prefix: string; path: string}> = {
  weekly: {ms: 7 * DAY_MS, days: 7, prefix: 'Last 7 days:', path: '/family/report/week'},
  daily: {ms: DAY_MS, days: 1, prefix: 'Last 24 hours:', path: '/family/report/day'},
};

/** `ActivityService.ACTIVITY_CONTROL_TYPE`: a marker row, not activity. */
const ACTIVITY_CONTROL_TYPE = 'activity_control';
const SENT_PREFIX = 'activity_report_sent:';
const ACCOUNT_BATCH = 200;

/**
 * The admin's choice, from `notificationSettings.frequencies`. Settings saved before it was there
 * keep it inside the category, read the way `NotificationService.canSend` reads a category.
 *
 * It is outside `categories` because app builds from before HAT-655 save every category they have
 * no row for as `{email, push}` only, which dropped it; they save the other top-level fields as
 * they found them. The settings page (NotificationSettings.vue) writes it there.
 */
export function activityReportFrequency(notificationSettings: unknown): ActivityReportFrequency {
  const settings =
    notificationSettings && typeof notificationSettings === 'object' ? (notificationSettings as any) : null;
  const chosen = settings?.frequencies?.[NotificationType.ACTIVITY_REPORT];
  if (isFrequency(chosen)) return chosen;
  const categories =
    settings?.categories && typeof settings.categories === 'object' ? settings.categories : (settings ?? {});
  const packaged = (userPrefDefaults.notificationSettings.categories as Record<string, any>)[
    NotificationType.ACTIVITY_REPORT
  ];
  const frequency = (categories[NotificationType.ACTIVITY_REPORT] || packaged)?.frequency;
  return isFrequency(frequency) ? frequency : 'weekly';
}

function isFrequency(value: unknown): value is ActivityReportFrequency {
  return value === 'daily' || value === 'off' || value === 'weekly';
}

/**
 * Whether an admin's report is due: from 7 PM family time, on Sundays for weekly, and not already
 * sent on today's family-local date.
 */
export function activityReportDue(
  frequency: ActivityReportFrequency,
  nowMs: number,
  timeZone: string,
  last: ActivityReportSent | null,
): boolean {
  if (frequency === 'off') return false;
  if (localHour(nowMs, timeZone) < ACTIVITY_REPORT_HOUR) return false;
  if (frequency === 'weekly' && dayOfWeekInTimeZone(nowMs, timeZone) !== 0) return false;
  return last?.dateKey !== dateKeyInTimeZone(nowMs, timeZone);
}

/**
 * What the report covers: from the last report when it was this often and within the period, so
 * nothing falls between two reports; otherwise the whole period. Never longer than the period.
 */
export function activityReportWindow(
  frequency: ActivityReportPeriod,
  nowMs: number,
  last: ActivityReportSent | null,
): {startMs: number; days: number} {
  const period = PERIODS[frequency];
  const floor = nowMs - period.ms;
  const sameFrequency = !last?.frequency || last.frequency === frequency;
  const from = last && sameFrequency && last.sentAtMs >= floor && last.sentAtMs < nowMs ? last.sentAtMs : floor;
  return {startMs: from, days: period.days};
}

/**
 * The report page "See report" opens, with the window this report counted (`from` and `to`, in ms),
 * so the page shows the time the line describes rather than its own last 7 days or 24 hours.
 */
export function activityReportPath(frequency: ActivityReportPeriod, startMs: number, endMs: number): string {
  return `${PERIODS[frequency].path}?from=${Math.floor(startMs)}&to=${Math.floor(endMs)}`;
}

/**
 * Days each child was active in the window: the family-local dates their activity sessions started
 * on, a session that started before the window counting from its start. Never reads `data`, which
 * is end-to-end encrypted. `updatedAt` is the session's last activity: a guardian's rewrite of the
 * row keeps it (`ActivityService.saveUserActivityLog`).
 */
export function activityReportDaysActive(
  rows: {userId: string; createdAt: Date | string | number; updatedAt: Date | string | number}[],
  window: {startMs: number; days: number},
  timeZone: string,
): Map<string, number> {
  const dates = new Map<string, Set<string>>();
  for (const row of rows) {
    if (toMs(row.updatedAt) < window.startMs) continue;
    const at = Math.max(toMs(row.createdAt), window.startMs);
    if (!Number.isFinite(at)) continue;
    if (!dates.has(row.userId)) dates.set(row.userId, new Set());
    dates.get(row.userId)!.add(dateKeyInTimeZone(at, timeZone));
  }
  return new Map([...dates].map(([userId, keys]) => [userId, Math.min(keys.size, window.days)]));
}

/** "Mia", "Mia or Ben", "Mia, Ben or Sam". */
export function joinNamesWithOr(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/**
 * The whole report in one line, children by name:
 * "Last 7 days: Aiden was active on 5 days. No activity from Ben or Mia."
 * "Last 7 days: no activity from Aiden or Mia."
 */
export function activityReportMessage(
  frequency: ActivityReportPeriod,
  children: {name: string; daysActive: number}[],
): {line: string; anyActive: boolean} {
  const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
  const prefix = PERIODS[frequency].prefix;
  const active = sorted.filter((c) => c.daysActive > 0);
  const inactive = sorted.filter((c) => !(c.daysActive > 0)).map((c) => c.name);

  if (active.length === 0) {
    return {line: `${prefix} no activity from ${joinNamesWithOr(inactive)}.`, anyActive: false};
  }
  const parts = active.map((c) =>
    frequency === 'weekly'
      ? `${c.name} was active on ${c.daysActive} ${c.daysActive === 1 ? 'day' : 'days'}.`
      : `${c.name} was active.`,
  );
  if (inactive.length > 0) parts.push(`No activity from ${joinNamesWithOr(inactive)}.`);
  return {line: `${prefix} ${parts.join(' ')}`, anyActive: true};
}

type Member = {
  _id: string;
  accountId: string;
  type: string | null;
  username?: string | null;
  displayedName?: string | null;
};

/** The people a family's report is about and for. */
function family(members: Member[]): {children: Member[]; admins: Member[]} {
  // A child is a restricted user, the same people the client's report page lists. A child's
  // activity is always logged, whatever `options.logActivity` says (scriptInjectionPolicy.ts).
  const children = members.filter((m) => m.type === UserType.restricted);
  const admins = members.filter((m) => m.type === UserType.admin);
  return {children, admins};
}

/**
 * The activity report (HAT-655): which children were active, weekly on Sunday evening by default,
 * daily, or off, chosen by each admin in Notifications. It goes out when no child was active too,
 * saying so, so an admin does not open a report to find it empty; then it has nothing to open.
 *
 * A 15-minute job (`RECURRING_JOBS`) sends each admin's report from 7 PM in the family's timezone,
 * once a family-local day, remembered per admin in `sys_info`. A family with no timezone is skipped:
 * an admin's app sets it on sign-in. Every plan gets it.
 */
export class ActivityReportService {
  private static _staticInstance: ActivityReportService | null = null;
  static get instance(): ActivityReportService {
    if (!this._staticInstance) this._staticInstance = new ActivityReportService();
    return this._staticInstance;
  }

  // NotificationService takes an injected SetupService, so it must come from the container.
  private readonly notificationService = container.resolve(NotificationService);
  private readonly sysInfo = new SysInfoRepo();
  private readonly userPrefs = new UserPrefRepo();

  /** The job. `skipped` counts admins with a child who got no report this run, failures included. */
  async run(nowMs: number = Date.now()): Promise<{sent: number; skipped: number}> {
    const accounts = await this.accountsPastReportHour(nowMs);
    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < accounts.length; i += ACCOUNT_BATCH) {
      const batch = accounts.slice(i, i + ACCOUNT_BATCH);
      const members = await this.members(batch.map((a) => a.accountId));
      const byAccount = new Map<string, Member[]>();
      for (const m of members) {
        if (!byAccount.has(m.accountId)) byAccount.set(m.accountId, []);
        byAccount.get(m.accountId)!.push(m);
      }
      const adminIds = members.filter((m) => m.type === UserType.admin).map((m) => m._id);
      const lastSent = await this.lastSent(adminIds);

      // One read of notification settings for the batch, only for the admins who could get a
      // report now: the family has a child, and none was sent today.
      const waiting = batch.flatMap(({accountId, timeZone}) => {
        const {children, admins} = family(byAccount.get(accountId) ?? []);
        if (children.length === 0) return [];
        const todayKey = dateKeyInTimeZone(nowMs, timeZone);
        return admins.filter((a) => lastSent.get(a._id)?.dateKey !== todayKey).map((a) => a._id);
      });
      let frequencies: Map<string, ActivityReportFrequency> | null = null;
      try {
        frequencies = await this.frequencies(waiting);
      } catch (error) {
        // Each admin waiting is counted as skipped below, as a failure is.
        logger.error('[activity-report] notification settings read failed', error);
      }

      for (const {accountId, timeZone} of batch) {
        const accountMembers = byAccount.get(accountId) ?? [];
        try {
          const result = await this.runAccount(accountId, timeZone, accountMembers, lastSent, frequencies, nowMs);
          sent += result.sent;
          skipped += result.skipped;
        } catch (error) {
          logger.error(`[activity-report] ${accountId} failed`, error);
          skipped += accountMembers.filter((m) => m.type === UserType.admin).length;
        }
      }
    }
    return {sent, skipped};
  }

  private async runAccount(
    accountId: string,
    timeZone: string,
    members: Member[],
    lastSent: Map<string, ActivityReportSent | null>,
    frequencies: Map<string, ActivityReportFrequency> | null,
    nowMs: number,
  ): Promise<{sent: number; skipped: number}> {
    const {children, admins} = family(members);
    if (children.length === 0 || admins.length === 0) return {sent: 0, skipped: 0};

    let skipped = 0;
    const due: {adminId: string; frequency: ActivityReportPeriod; window: {startMs: number; days: number}}[] = [];
    const todayKey = dateKeyInTimeZone(nowMs, timeZone);
    for (const admin of admins) {
      try {
        const last = lastSent.get(admin._id) ?? null;
        // Already sent today: the job runs every 15 minutes until midnight.
        if (last?.dateKey === todayKey) {
          skipped++;
          continue;
        }
        // No frequency when the batch's settings read failed, logged once in run().
        const frequency = frequencies?.get(admin._id);
        if (!frequency || frequency === 'off' || !activityReportDue(frequency, nowMs, timeZone, last)) {
          skipped++;
          continue;
        }
        due.push({adminId: admin._id, frequency, window: activityReportWindow(frequency, nowMs, last)});
      } catch (error) {
        logger.error(`[activity-report] ${admin._id} failed`, error);
        skipped++;
      }
    }
    if (due.length === 0) return {sent: 0, skipped};

    // One read for the account, from the earliest window any due admin needs.
    const rows = await this.activityRows(
      children.map((c) => c._id),
      Math.min(...due.map((d) => d.window.startMs)),
    );

    let sent = 0;
    for (const {adminId, frequency, window} of due) {
      try {
        const days = activityReportDaysActive(rows, window, timeZone);
        const {line, anyActive} = activityReportMessage(
          frequency,
          children.map((c) => ({name: c.displayedName || c.username || 'A child', daysActive: days.get(c._id) ?? 0})),
        );
        const path = activityReportPath(frequency, window.startMs, nowMs);
        // A child can set their own name, and the notice and the email are HTML; the push is text.
        const html = escapeHtml(line);
        await this.notificationService.addUserNotification(
          new RequestContext({currentUserId: adminId, accountId, request: {type: RequestTypes.taskRunner}}),
          NotificationType.ACTIVITY_REPORT,
          adminId,
          accountId,
          adminId,
          {
            title: 'Activity report',
            message: html,
            shortMessage: line,
            emailMessage: html,
            // Nothing to open when no child was active: the line already says so.
            ...(anyActive
              ? {
                  refInfo: {type: 'NAVIGATE_PATH', path},
                  actions: [{name: 'openPath', label: 'See report', data: {path}}],
                }
              : {}),
          },
          true,
        );
        const record: ActivityReportSent = {dateKey: dateKeyInTimeZone(nowMs, timeZone), sentAtMs: nowMs, frequency};
        await this.sysInfo.create({_id: SENT_PREFIX + adminId, data: record as any});
        sent++;
      } catch (error) {
        logger.error(`[activity-report] ${adminId} failed`, error);
        skipped++;
      }
    }
    return {sent, skipped};
  }

  /** Accounts with a valid family timezone where it is 7 PM or later now. */
  private async accountsPastReportHour(nowMs: number): Promise<{accountId: string; timeZone: string}[]> {
    const rows: {_id: string; timeZone: string | null}[] = await knex('account')
      .whereRaw(`coalesce(options::jsonb ->> 'familyTimeZone', '') <> ''`)
      .select('_id', knex.raw(`options::jsonb ->> 'familyTimeZone' as "timeZone"`));
    const pastHour = new Map<string, boolean>();
    const accounts: {accountId: string; timeZone: string}[] = [];
    for (const row of rows) {
      const tz = row.timeZone;
      if (!pastHour.has(tz)) pastHour.set(tz, isValidTimeZone(tz) && localHour(nowMs, tz) >= ACTIVITY_REPORT_HOUR);
      if (pastHour.get(tz)) accounts.push({accountId: row._id, timeZone: tz});
    }
    return accounts;
  }

  /** Each admin's frequency, from one read of their notification settings. */
  private async frequencies(adminIds: string[]): Promise<Map<string, ActivityReportFrequency>> {
    if (adminIds.length === 0) return new Map();
    const prefs = await this.userPrefs.getUserPrefForUsers(adminIds, UserPrefKeys.notificationSettings);
    return new Map(adminIds.map((id) => [id, activityReportFrequency(prefs.get(id))]));
  }

  private async members(accountIds: string[]): Promise<Member[]> {
    if (accountIds.length === 0) return [];
    return await knex('user')
      .whereIn('accountId', accountIds)
      .whereRaw('coalesce(disabled, false) = false')
      .orderBy('_id')
      .select('_id', 'accountId', 'type', 'username', 'displayedName');
  }

  private async lastSent(adminIds: string[]): Promise<Map<string, ActivityReportSent | null>> {
    if (adminIds.length === 0) return new Map();
    const rows: {_id: string; data: unknown}[] = await knex('sys_info')
      .whereIn(
        '_id',
        adminIds.map((id) => SENT_PREFIX + id),
      )
      .select('_id', 'data');
    return new Map(rows.map((r) => [r._id.slice(SENT_PREFIX.length), readSent(r.data)]));
  }

  /** Session start and last update only: `data` is end-to-end encrypted and never read here. */
  private async activityRows(
    childIds: string[],
    sinceMs: number,
  ): Promise<{userId: string; createdAt: Date; updatedAt: Date}[]> {
    return await knex('user_activity_log')
      .whereIn('userId', childIds)
      .where('updatedAt', '>=', new Date(sinceMs))
      .where((q) => q.whereNull('type').orWhereNot('type', ACTIVITY_CONTROL_TYPE))
      .select('userId', 'createdAt', 'updatedAt');
  }
}

function localHour(nowMs: number, timeZone: string): number {
  return new Date(nowMs + timeZoneOffsetMinutes(nowMs, timeZone) * 60_000).getUTCHours();
}

function toMs(value: Date | string | number): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function readSent(data: unknown): ActivityReportSent | null {
  const d = (typeof data === 'string' ? safeParse(data) : data) as Partial<ActivityReportSent> | null;
  if (!d || typeof d.dateKey !== 'string' || typeof d.sentAtMs !== 'number') return null;
  const frequency = d.frequency === 'weekly' || d.frequency === 'daily' ? d.frequency : undefined;
  return {dateKey: d.dateKey, sentAtMs: d.sentAtMs, ...(frequency ? {frequency} : {})};
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
