/**
 * A parent's "yes", in a form a device can act on with no browser in the loop.
 *
 * ## Why this exists
 *
 * Rules reach a device as a COMPILED ruleset, built in the extension from the child's limits plus
 * the live app inventory, and pushed over the local bridge. That works right up until the moment it
 * matters: a child blocked from a game at 9pm has no browser open, so the extension is not running,
 * so nothing recompiles, so an approval a parent taps on their phone cannot reach the machine. The
 * child asks, the parent says yes, and the block stays up until somebody opens Chrome.
 *
 * The obvious fix — have the server hold the compiled ruleset and hand it back — is the wrong one.
 * The server cannot compile: it has no app inventory, and doing so would put a policy blob for
 * every child at rest on the server for the sake of a feature that does not need it.
 *
 * So the server sends a GRANT, never a policy. A grant is small, time-bounded, derived from data
 * the server already holds in plaintext (`UserOptions.ruleOverrideSettings`), and is applied by the
 * device to the ruleset it has already cached.
 *
 * ## The invariant
 *
 * **A grant may only ever loosen.** It is delivered over the heartbeat, which is not an
 * authenticated command channel in the sense a policy push would need to be — so the worst a
 * forged or replayed grant can do must be to give a child time a parent did not intend, never to
 * take away time a parent did. That is a bad day; the inverse is a child locked out of their own
 * computer by a stranger.
 *
 * The invariant is structural rather than a rule someone has to remember:
 *  - a budget grant is applied as `max(existing, granted)`, so it cannot lower one;
 *  - an app grant only ever REMOVES an id from the blocked set, and has no way to add one;
 *  - every grant carries `until` and is dropped the moment it passes.
 *
 * Do not add a grant kind that can tighten anything. If a parent needs to take something away, that
 * is a policy change and it belongs in the compiled ruleset, over the bridge, where it is authored.
 */

export type DeviceGrantKind = 'rule-budget' | 'app-unblock';

export interface DeviceGrant {
  kind: DeviceGrantKind;
  /** For `rule-budget`: which compiled rule this raises. */
  ruleId?: string;
  /**
   * For `rule-budget`: today's budget in ms, as the parent's override states it.
   *
   * A replacement figure rather than a delta, because that is what a `RuleOverride` actually is —
   * and because a delta applied twice (two heartbeats, one grant) would silently double.
   */
  budgetMsToday?: number;
  /**
   * Days this grant applies on, `0`=Sunday. Absent or empty means every day.
   *
   * Carried rather than resolved by the sender, because "what day is it" is a question only the
   * DEVICE can answer: schedules are reckoned in the family's timezone, and the server is on UTC.
   * A weekend override filtered server-side would raise a Wednesday budget for a family far enough
   * east or west of it.
   */
  daysOfWeek?: number[];
  /** For `app-unblock`: the `<platform>:<pkg>` id to stop blocking. */
  appId?: string;
  /** Epoch ms after which this grant is dead. Required — a grant with no end is a policy change. */
  until: number;
}

/** Anything without a usable `until` is not a grant, whatever else it carries. */
export function isDeviceGrant(value: unknown): value is DeviceGrant {
  if (!value || typeof value !== 'object') return false;
  const grant = value as Partial<DeviceGrant>;
  if (grant.kind !== 'rule-budget' && grant.kind !== 'app-unblock') return false;
  if (typeof grant.until !== 'number' || !Number.isFinite(grant.until)) return false;
  if (grant.kind === 'rule-budget') {
    return typeof grant.ruleId === 'string' && grant.ruleId.length > 0
      && typeof grant.budgetMsToday === 'number' && Number.isFinite(grant.budgetMsToday) && grant.budgetMsToday >= 0;
  }
  return typeof grant.appId === 'string' && grant.appId.length > 0;
}

/**
 * The grants still worth applying.
 *
 * Parses defensively: this arrives over the network, and a malformed entry must drop itself rather
 * than take the well-formed ones with it. A device that throws here stops enforcing.
 */
export function activeGrants(raw: unknown, nowMs: number): DeviceGrant[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is DeviceGrant => isDeviceGrant(entry) && entry.until > nowMs);
}

/** Does this grant apply on the family's today? An absent or empty day list means every day. */
export function grantAppliesOnDay(grant: DeviceGrant, dowLocal: number): boolean {
  const days = grant.daysOfWeek;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.includes(dowLocal);
}
