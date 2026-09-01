/**
 * Turning a parent's approval into something a device can act on with no browser in the loop.
 *
 * The reasoning behind grants — and the invariant that one may only ever LOOSEN — lives in
 * `tset-sharedlib/restrictions/deviceGrants`. This is the server half: it reads what a parent has
 * already saved and states it in that vocabulary.
 *
 * It reads `UserOptions.ruleOverrideSettings`, which the server stores in plaintext and which is
 * exactly what "give them another half hour" writes today. Nothing new is persisted, and no
 * compiled policy is put at rest here: the server never learns which apps a child has, only that a
 * rule the device already knows about has a bigger number today.
 *
 * Pure, so the expiry and clamping arithmetic is testable without a database.
 */
import type {DeviceGrant} from 'tset-sharedlib/restrictions/deviceGrants';

const HOUR_MS = 60 * 60 * 1000;

/** A rule override as `UserOptions` stores it. Kept local — the server only reads these fields. */
type StoredRuleOverride = {
  ruleId?: string;
  timeLimit?: {hours?: number; daysOfWeek?: number[]};
  expiresAt?: number;
};

/**
 * The ceiling on a single grant, in hours.
 *
 * Not a security boundary — a parent can set whatever they like in the app. It is a guard against
 * a malformed or absurd stored value (`hours: 1e9`) becoming a budget so large the device stops
 * enforcing that rule entirely for the day, which would look exactly like Kindredly being broken.
 */
export const MAX_GRANT_HOURS = 24;

/**
 * Grants for one child, from their stored overrides.
 *
 * Day scoping is PASSED THROUGH rather than resolved here. "Is it Wednesday" is a question only
 * the device can answer — schedules are reckoned in the family's timezone and this process is on
 * UTC, so filtering here would raise the wrong day's budget for a family far enough east or west.
 */
export function buildDeviceGrants(ruleOverrides: unknown, nowMs: number): DeviceGrant[] {
  if (!Array.isArray(ruleOverrides)) return [];

  const grants: DeviceGrant[] = [];
  for (const raw of ruleOverrides as StoredRuleOverride[]) {
    if (!raw || typeof raw !== 'object') continue;
    const ruleId = typeof raw.ruleId === 'string' ? raw.ruleId.trim() : '';
    if (!ruleId) continue;

    const expiresAt = typeof raw.expiresAt === 'number' ? raw.expiresAt : 0;
    // An override with no end would become a grant with no end, which is a policy change.
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) continue;

    const days = raw.timeLimit?.daysOfWeek;

    const hours = raw.timeLimit?.hours;
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) continue;

    grants.push({
      kind: 'rule-budget',
      ruleId,
      budgetMsToday: Math.min(hours, MAX_GRANT_HOURS) * HOUR_MS,
      ...(Array.isArray(days) && days.length > 0 ? {daysOfWeek: days} : {}),
      until: expiresAt,
    });
  }
  return grants;
}
