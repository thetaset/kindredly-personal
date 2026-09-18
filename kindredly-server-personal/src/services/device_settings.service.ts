import {Knex} from 'knex';
import knex from '@/db/knex_config';
import {RefStateRepo} from '@/db/ref_state.repo';
import SSEManager from './sse.manager';
import {familyDowntimeForDevice, normalizeFamilyDowntime} from 'tset-sharedlib/restrictions/familyDowntime';
import type {
  DeviceAppPolicy,
  DeviceAppPolicyStatus,
  DeviceSettings,
  DeviceSettingsCurrentResponse,
} from 'tset-sharedlib/types/device-guard.types';

/**
 * The server's half of the device settings contract (DCP-5, device control plane redesign §4.1/§4.3).
 *
 * The server stores settings and tells devices when they changed; each device compiles its own
 * rules (D2). This file decides which settings a device reads, whether a write changed them, and
 * what a device fetches. The version itself moves in `device_settings_version.repo.ts`, inside
 * each write's own statement or transaction.
 */

/** The `accessControlSettings` fields a device reads. Everything else there (check-in, filters) is not. */
const DEVICE_ACCESS_CONTROL_KEYS = [
  'disableUsageLimits',
  'disableUsageLimitsExpires',
  'usageLimitInterventionMode',
  'defaultInterventionMode',
] as const;

export const DEVICE_GUARD_REF_TYPE = 'device-guard';
export const DEVICE_GUARD_REF_ID = 'companion';
export const DEVICE_APP_POLICY_STATE_KEY = 'appPolicy';

/** The option-backed part of `DeviceSettings`: everything but the app policy. */
export type DeviceOptionSettings = Omit<DeviceSettings, 'appPolicy' | 'appPolicyStatus'>;

/**
 * The device-relevant slice of a user's options. Pure: the same function builds what a device
 * fetches and decides whether a write changed it, so the two cannot disagree about which fields
 * count.
 */
export function deviceSettingsFromOptions(options: unknown): DeviceOptionSettings {
  const o = (options && typeof options === 'object' ? options : {}) as Record<string, any>;
  const limits = o.usageLimitsData && typeof o.usageLimitsData === 'object' ? o.usageLimitsData : {};
  const overrides = o.ruleOverrideSettings && typeof o.ruleOverrideSettings === 'object' ? o.ruleOverrideSettings : {};
  const access = o.accessControlSettings && typeof o.accessControlSettings === 'object' ? o.accessControlSettings : {};

  const accessControlSettings: DeviceOptionSettings['accessControlSettings'] = {};
  for (const key of DEVICE_ACCESS_CONTROL_KEYS) {
    if (access[key] !== undefined && access[key] !== null) (accessControlSettings as any)[key] = access[key];
  }

  return {
    usageLimitsData: {
      contentUsageLimits: Array.isArray(limits.contentUsageLimits) ? limits.contentUsageLimits : [],
      // Reward "new rule" grants live here, not in contentUsageLimits, each with its own `expiresAtMs`.
      // The browser merges the unexpired ones into its limits at read time
      // (`ActivityLogDataService._getUsageLimitsData`); a device does the same with its own clock.
      temporaryRules: Array.isArray(limits.temporaryRules) ? limits.temporaryRules : [],
    },
    ruleOverrideSettings: {ruleOverrides: Array.isArray(overrides.ruleOverrides) ? overrides.ruleOverrides : []},
    accessControlSettings,
  };
}

/**
 * JSON with object keys sorted. Options come back from Postgres jsonb with its own key order and go
 * in with the client's, so a plain `JSON.stringify` would call an unchanged write a change.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v === undefined ? null : v)).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * The Blocked message, which a device shows as the note on its Family Downtime shield. Trimmed, and
 * absent when blank, so re-saving it with trailing space does not wake a device.
 */
export function blockedMessageFromOptions(options: unknown): string | undefined {
  const o = (options && typeof options === 'object' ? options : {}) as Record<string, any>;
  const message = o.accessControlSettings?.usageGuidanceMessage;
  const text = typeof message === 'string' ? message.trim() : '';
  return text || undefined;
}

/** Whether an options write changed anything a device enforces or shows. A display preference does not. */
export function deviceSettingsChanged(beforeOptions: unknown, afterOptions: unknown): boolean {
  return (
    stableStringify(deviceSettingsFromOptions(beforeOptions)) !==
      stableStringify(deviceSettingsFromOptions(afterOptions)) ||
    blockedMessageFromOptions(beforeOptions) !== blockedMessageFromOptions(afterOptions)
  );
}

/** A valid IANA timezone id, as this runtime knows them. */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', {timeZone});
    return true;
  } catch {
    return false;
  }
}

/**
 * The one post-write nudge for "these users' device settings changed" (§4.1). Call it after the
 * write commits, and only when the version was raised.
 *
 * Content-free on every channel. What it sends today:
 * - SSE `deviceSettingsChanged` to each user.
 * - The silent push `syncDeviceRules`, to every push token the child's clients registered. On an
 *   Android child's phone that is Guard's own token (DCP-7), which reaches Guard with Kindredly
 *   force-stopped, and Kindredly's, which passes the nudge to older Guard builds. App policy saves
 *   used to send SSE only, so a block took up to 20 s to reach a phone.
 *
 * DCP-8 and DCP-14 add the desktop stream and APNs here. Never awaited: a slow push provider must
 * not fail or slow the guardian's save.
 */
export function notifyDeviceSettingsChanged(userIds: string[]): void {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  const sse = SSEManager.getInstance();
  let notificationService: {sendSilentDeviceRuleSync(userId: string): Promise<unknown>} | null = null;
  try {
    // Lazy and relative (CLAUDE.md): ref_state.service imports this file, and a top-level import of
    // the container would load every service while ref_state.service is still initialising.
    const {container} = require('../inversify.config');
    notificationService = container.resolve(require('./notification.service').default);
  } catch (e) {
    console.error('[device-settings] notification service unavailable', e);
  }
  for (const userId of ids) {
    sse.broadcastToUser(userId, 'deviceSettingsChanged', {}).catch((e) => {
      console.warn('[device-settings] SSE nudge failed', e?.message || e);
    });
    void notificationService
      ?.sendSilentDeviceRuleSync(userId)
      .catch((e) => console.error('[device-settings] silent push failed', e?.message || e));
  }
}

function appPolicyFromRow(row: {data?: unknown; encrypted?: boolean; encInfo?: unknown} | undefined): {
  appPolicy: DeviceAppPolicy | null;
  appPolicyStatus: DeviceAppPolicyStatus;
} {
  if (!row) return {appPolicy: null, appPolicyStatus: 'absent'};
  const data = row.data as DeviceAppPolicy | undefined;
  const readable = !row.encrypted && row.encInfo == null && !!data && typeof data === 'object' && !Array.isArray(data);
  return readable ? {appPolicy: data, appPolicyStatus: 'readable'} : {appPolicy: null, appPolicyStatus: 'unreadable'};
}

export class DeviceSettingsService {
  constructor(
    private db: Knex = knex,
    private refStateRepo = new RefStateRepo(),
  ) {}

  /**
   * What `POST /companion/settings/current` returns for the user a device token was minted for.
   *
   * `userId` must come from the token, never a request body: that is what stops one child's device
   * reading a sibling's settings.
   *
   * Reads the version FIRST, then the settings. A write that commits between the two reads has
   * raised the version past the one returned here, so the device fetches again next time. Read the
   * other way round, a device could store old settings under the new version and never fetch again.
   */
  async currentForUser(
    userId: string,
    knownVersion: number | undefined,
    nowMs = Date.now(),
  ): Promise<DeviceSettingsCurrentResponse> {
    const user = await this.db('user')
      .where({_id: userId})
      .first('_id', 'accountId', 'options', 'deviceSettingsVersion', 'deleted');
    if (!user || user.deleted) throw new Error('User not found');

    const version = Number(user.deviceSettingsVersion || 0);
    if (knownVersion !== undefined && knownVersion === version) {
      return {version, serverTimeMs: nowMs};
    }

    const account = user.accountId ? await this.db('account').where({_id: user.accountId}).first('options') : undefined;
    const familyTimeZone = isValidTimeZone(account?.options?.familyTimeZone) ? account.options.familyTimeZone : null;

    const [policyRow] = await this.refStateRepo.listByRef({
      ownerType: 'user',
      ownerId: userId,
      refType: DEVICE_GUARD_REF_TYPE,
      refId: DEVICE_GUARD_REF_ID,
      stateKey: DEVICE_APP_POLICY_STATE_KEY,
      stateSubKey: '',
      limit: 1,
    });

    // Actual times, not the schedule: a device checks "is now inside one" and never has to know the
    // family's midnight or daylight-saving rules. No dismissals: a device app only ever enforces for
    // a child, and a child cannot dismiss.
    const note = blockedMessageFromOptions(user.options);
    const familyDowntime = {
      ...familyDowntimeForDevice(normalizeFamilyDowntime(account?.options?.familyDowntime), nowMs, familyTimeZone),
      ...(note ? {note} : {}),
    };

    const settings: DeviceSettings = {
      ...deviceSettingsFromOptions(user.options),
      ...appPolicyFromRow(policyRow),
      familyDowntime,
    };
    return {version, serverTimeMs: nowMs, settings, familyTimeZone};
  }
}

export default DeviceSettingsService;

/** The user's current device settings version, for a guardian's "waiting for the device" state (DCP-10). */
export async function deviceSettingsVersionOf(userId: string, db: Knex = knex): Promise<number> {
  const row = await db('user').where({_id: userId}).first('deviceSettingsVersion');
  return Number(row?.deviceSettingsVersion || 0);
}
