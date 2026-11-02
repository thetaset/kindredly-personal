import knex from '@/db/knex_config';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {UserPrefKeys, UserPrefRepo} from '@/db/user_pref.repo';
import {container} from '@/inversify.config';
import {NotificationMethod, NotificationType} from '@/typing/enum_strings';
import {logger} from '@/utils/logger';
import {dateKeyInTimeZone} from 'tset-sharedlib/deviceguard/compileDeviceSettings';
import {
  normalizeFamilyDowntime,
  resolveFamilyDowntime,
  type FamilyDowntimeSettings,
  type FamilyDowntimeState,
} from 'tset-sharedlib/restrictions/familyDowntime';
import {UserType} from 'tset-sharedlib/shared.types';
import {isValidTimeZone} from './device_settings.service';
import NotificationService from './notification.service';

/** The stretch of downtime an account's admins were last told about. */
export type FamilyDowntimeTold = {startedAtMs: number; endsAtMs: number};

/**
 * What to send, from the stretch the admins were told about and the one on now.
 *
 * A stretch is known by its start, so a downtime that is extended while on is not announced again,
 * and End now followed by Start now is.
 */
export function familyDowntimeNoticeStep(
  told: FamilyDowntimeTold | null,
  state: Pick<FamilyDowntimeState, 'active' | 'startedAtMs' | 'endsAtMs'>,
): {send: 'start' | 'clear' | null; told: FamilyDowntimeTold | null} {
  if (state.active && state.startedAtMs !== null && state.endsAtMs !== null) {
    const now = {startedAtMs: state.startedAtMs, endsAtMs: state.endsAtMs};
    return {send: told?.startedAtMs === now.startedAtMs ? null : 'start', told: now};
  }
  return {send: told ? 'clear' : null, told: null};
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "On until 9:00 PM." in the family's timezone, "tomorrow" or the weekday when it ends on another day.
 * A family with only one-offs may have no timezone; the push cannot know the phone's, so it says "On now."
 */
export function familyDowntimeNoticeBody(endsAtMs: number, nowMs: number, timeZone: string | null): string {
  if (!timeZone) return 'On now.';
  const time = new Intl.DateTimeFormat('en-US', {timeZone, hour: 'numeric', minute: '2-digit'}).format(endsAtMs);
  const days = Math.round(
    (Date.parse(dateKeyInTimeZone(endsAtMs, timeZone)) - Date.parse(dateKeyInTimeZone(nowMs, timeZone))) / DAY_MS,
  );
  if (days <= 0) return `On until ${time}.`;
  if (days === 1) return `On until ${time} tomorrow.`;
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'short'}).format(endsAtMs);
    return `On until ${weekday} ${time}.`;
  }
  const date = new Intl.DateTimeFormat('en-US', {timeZone, month: 'short', day: 'numeric'}).format(endsAtMs);
  return `On until ${date}, ${time}.`;
}

const TOLD_PREFIX = 'family_downtime_notice:';

/**
 * Family Downtime on a parent's phone (HAT-380): a notification when it starts, removed when it ends.
 *
 * Downtime starts and ends on the clock, and until now only devices kept time for it. A one-minute
 * job (`RECURRING_JOBS`) and every Family Downtime save both call `sync`, which compares the stretch
 * on now with the one this account's admins were last told about — a `sys_info` row per account,
 * there only while a notice is showing. So each stretch is announced once however it began (a
 * schedule, a one-off, Start now, turning the feature on during a schedule) and removed once however
 * it ended (its end, End now, turning the feature off).
 *
 * Admins only: a child is locked anyway and sees the downtime screen. Each admin's push setting for
 * FAMILY_DOWNTIME applies, and an admin who already dismissed this downtime is not told about it.
 * The Kindredly phone app shows it; the Companion is not needed.
 */
export class FamilyDowntimeNoticeService {
  private static _staticInstance: FamilyDowntimeNoticeService | null = null;
  static get instance(): FamilyDowntimeNoticeService {
    if (!this._staticInstance) this._staticInstance = new FamilyDowntimeNoticeService();
    return this._staticInstance;
  }

  // NotificationService takes an injected SetupService, so it must come from the container.
  private readonly notificationService = container.resolve(NotificationService);
  private readonly sysInfo = new SysInfoRepo();
  private readonly userPrefs = new UserPrefRepo();

  /** The job: every account with Family Downtime on, and every account with a notice showing. */
  async run(nowMs: number = Date.now()): Promise<{started: number; cleared: number}> {
    const accounts: {_id: string; options: any}[] = await knex('account')
      .whereRaw(`(options::jsonb -> 'familyDowntime' ->> 'enabled') = 'true'`)
      .select('_id', 'options');
    const toldRows: {_id: string; data: any}[] = await knex('sys_info')
      .where('_id', 'like', `${TOLD_PREFIX}%`)
      .select('_id', 'data');

    const told = new Map(toldRows.map((r) => [r._id.slice(TOLD_PREFIX.length), readTold(r.data)]));
    // An account that turned downtime off, or was deleted, while a notice showed: nothing is on now.
    const options = new Map<string, any>(accounts.map((a) => [a._id, a.options]));
    for (const accountId of told.keys()) if (!options.has(accountId)) options.set(accountId, null);

    let started = 0;
    let cleared = 0;
    for (const [accountId, accountOptions] of options) {
      try {
        const sent = await this.syncWith(accountId, accountOptions, told.get(accountId) ?? null, nowMs);
        if (sent === 'start') started++;
        if (sent === 'clear') cleared++;
      } catch (error) {
        logger.error(`[family-downtime-notice] ${accountId} failed`, error);
      }
    }
    return {started, cleared};
  }

  /** After a Family Downtime save: Start now and End now reach the admins' phones without waiting for the job. */
  async sync(accountId: string, nowMs: number = Date.now()): Promise<'start' | 'clear' | null> {
    const row = await knex('account').where({_id: accountId}).first('options');
    const toldRow = await this.sysInfo.findById(TOLD_PREFIX + accountId);
    return this.syncWith(accountId, row?.options ?? null, readTold(toldRow?.data), nowMs);
  }

  private async syncWith(
    accountId: string,
    options: any,
    told: FamilyDowntimeTold | null,
    nowMs: number,
  ): Promise<'start' | 'clear' | null> {
    const settings = normalizeFamilyDowntime(options?.familyDowntime);
    const timeZone = isValidTimeZone(options?.familyTimeZone) ? options.familyTimeZone : null;
    const step = familyDowntimeNoticeStep(told, resolveFamilyDowntime(settings, nowMs, timeZone));

    if (step.send) {
      const adminIds = await this.adminIds(accountId);
      if (step.send === 'start') await this.sendStart(adminIds, settings, step.told!, timeZone, nowMs);
      else await this.notificationService.sendFamilyDowntimeNoticeClear(adminIds);
    }

    if (step.told) {
      if (step.send || told?.endsAtMs !== step.told.endsAtMs) {
        await this.sysInfo.create({_id: TOLD_PREFIX + accountId, data: step.told as any});
      }
    } else if (told) {
      await this.sysInfo.deleteWithId(TOLD_PREFIX + accountId);
    }
    return step.send;
  }

  private async sendStart(
    adminIds: string[],
    settings: FamilyDowntimeSettings,
    stretch: FamilyDowntimeTold,
    timeZone: string | null,
    nowMs: number,
  ) {
    const body = familyDowntimeNoticeBody(stretch.endsAtMs, nowMs, timeZone);
    for (const userId of adminIds) {
      if (settings.dismissals.some((d) => d.userId === userId && d.untilMs > nowMs)) continue;
      const prefs = await this.userPrefs.getUserPref(userId, UserPrefKeys.notificationSettings);
      if (!(await this.notificationService.canSend(prefs, NotificationMethod.push, NotificationType.FAMILY_DOWNTIME))) {
        continue;
      }
      await this.notificationService.sendFamilyDowntimeNotice(userId, {
        title: 'Family Downtime',
        body,
        endsAtMs: stretch.endsAtMs,
        nowMs,
      });
    }
  }

  private async adminIds(accountId: string): Promise<string[]> {
    const rows: {_id: string}[] = await knex('user')
      .where({accountId, type: UserType.admin})
      .whereRaw('coalesce(disabled, false) = false')
      .select('_id');
    return rows.map((r) => r._id);
  }
}

function readTold(data: unknown): FamilyDowntimeTold | null {
  const d = (typeof data === 'string' ? safeParse(data) : data) as Partial<FamilyDowntimeTold> | null;
  return d && typeof d.startedAtMs === 'number' && typeof d.endsAtMs === 'number'
    ? {startedAtMs: d.startedAtMs, endsAtMs: d.endsAtMs}
    : null;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
