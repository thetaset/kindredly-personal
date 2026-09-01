/**
 * Checkpoint — a daily check-in that sits on top of the daily schedule.
 *
 * A checkpoint holds until it is cleared for the day. Clearing lasts until the
 * next local reset boundary (midnight by default), after which it applies
 * again. Unlike a usage limit, waiting never clears it — someone has to act.
 *
 * How much it enforces, and whose action clears it, is the mode:
 *   reminder — never blocks; the user clears their own
 *   self     — blocks until the user clears their own
 *   guardian — blocks until an admin releases it
 *
 * This module is time + settings math only. Exception matching lives in the
 * client background so it can reuse `checkConditionList` rather than growing a
 * second, drifting matcher.
 */

import type {
  CheckpointMode,
  CheckpointRelease,
  CheckpointSettings,
  LimitMatchCondition,
} from '../types/usage-limits.types';

/**
 * The Usage Type that means "we could not tell".
 *
 * Never legal in a checkpoint exception: `checkConditionList` matches an ABSENT
 * eduValue against this value, so an exception naming it would match every URL
 * and open the gate completely. Stripped on save and again on match.
 */
export const CHECKPOINT_FORBIDDEN_EDU_VALUE = 'eduval_unknown';

/** Reset hour used when a checkpoint does not name one. */
export const DEFAULT_CHECKPOINT_RESET_HOUR = 0;

/**
 * Mode assumed when a stored checkpoint names none.
 *
 * Every record written before modes existed was a guardian-released gate on a
 * child, so this is the only answer that leaves those families untouched. Do
 * not "improve" it to something softer.
 */
export const LEGACY_CHECKPOINT_MODE: CheckpointMode = 'guardian';

/**
 * Condition types that cannot be judged until a page has been classified, and
 * for which we have no way to ask. An exception carrying one of these can never
 * match, so the editor warns rather than saving something inert.
 *
 * `eduValue` used to live here. It no longer does: it is answerable up front for
 * library items and the deterministic site table, and answerable after load for
 * everything else. That comes at the cost of a slower gate — see
 * `checkpointHasEduValueExceptions`.
 */
export const CHECKPOINT_CONTENT_SHAPED_CONDITION_TYPES: ReadonlyArray<LimitMatchCondition['type']> = [
  'intent',
  'sessionIntent',
  'socialDesignation',
  'attribute',
];

function normalizeResetHour(resetHourLocal?: number): number {
  if (typeof resetHourLocal !== 'number' || !Number.isFinite(resetHourLocal)) {
    return DEFAULT_CHECKPOINT_RESET_HOUR;
  }

  const hour = Math.trunc(resetHourLocal);
  if (hour < 0 || hour > 23) return DEFAULT_CHECKPOINT_RESET_HOUR;
  return hour;
}

/**
 * The next local instant at which the checkpoint re-applies — the next
 * occurrence of `resetHourLocal:00` strictly after `nowMs`.
 *
 * Built from the local-time Date constructor rather than fixed millisecond
 * arithmetic so month rollover and DST shifts land on the right wall-clock
 * hour. Deliberately not routed through `nowIsInTimeRange`, which cannot
 * express a window that crosses midnight.
 */
export function checkpointResetBoundaryMs(nowMs: number, resetHourLocal?: number): number {
  const hour = normalizeResetHour(resetHourLocal);
  const now = new Date(nowMs);
  const boundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);

  if (boundary.getTime() <= nowMs) {
    boundary.setDate(boundary.getDate() + 1);
  }

  return boundary.getTime();
}

/**
 * True when the checkpoint is enabled and not yet cleared for today.
 *
 * This is "still owed", NOT "is blocking" — a reminder holds all day and never
 * blocks anything. Use `checkpointBlocks` to decide about access.
 */
export function isCheckpointHolding(
  settings?: CheckpointSettings | null,
  release?: CheckpointRelease | null,
  nowMs: number = Date.now(),
): boolean {
  if (!settings || settings.enabled !== true) return false;

  const releasedUntilMs = release?.releasedUntilMs;
  if (typeof releasedUntilMs === 'number' && Number.isFinite(releasedUntilMs) && releasedUntilMs > nowMs) {
    return false;
  }

  return true;
}

/**
 * The mode a stored checkpoint is in. An unset or unrecognized mode reads as
 * `guardian` so pre-mode records keep blocking exactly as they did.
 *
 * Deliberately takes no user type: enforcement runs where the type is not
 * reliably known, so the mode has to come off the record itself.
 */
export function resolveCheckpointMode(settings?: CheckpointSettings | null): CheckpointMode {
  const mode = settings?.mode;
  if (mode === 'reminder' || mode === 'self' || mode === 'guardian') return mode;
  return LEGACY_CHECKPOINT_MODE;
}

/**
 * The mode a NEW checkpoint should start in, by who it is for. Write-time only
 * — every save stores an explicit mode so no reader has to infer one.
 *
 * An admin never defaults to `guardian`: there is nobody above them to release
 * it, so they would be locked out with no way back. They default to `self` —
 * a check-in that does nothing until you go looking for a switch is not a
 * check-in, and `self` is the strongest mode an adult can be offered because
 * they can always clear it themselves.
 *
 * Write-time only, so an adult whose record already says `reminder` keeps it.
 */
export function defaultCheckpointModeForUserType(userType?: string | null): CheckpointMode {
  return userType === 'restricted' ? 'guardian' : 'self';
}

/** True when this checkpoint's clear button belongs to the user, not a guardian. */
export function checkpointIsSelfClearable(settings?: CheckpointSettings | null): boolean {
  return resolveCheckpointMode(settings) !== 'guardian';
}

/**
 * True when the checkpoint should be holding web access closed right now.
 *
 * A reminder is still "holding" in the check-in sense but never blocks, so the
 * two enforcement call sites ask this rather than `isCheckpointHolding`.
 */
export function checkpointBlocks(
  settings?: CheckpointSettings | null,
  release?: CheckpointRelease | null,
  nowMs: number = Date.now(),
): boolean {
  if (resolveCheckpointMode(settings) === 'reminder') return false;
  return isCheckpointHolding(settings, release, nowMs);
}

/**
 * A release good until the next reset boundary.
 *
 * Who may write one depends on the mode: `guardian` is admin-only, the other
 * two are the user's own (`releasedBySelf`). The server enforces that — this is
 * just the record.
 */
export function buildCheckpointRelease(
  nowMs: number,
  settings?: CheckpointSettings | null,
  releasedByUserId?: string,
  releasedBySelf?: boolean,
): CheckpointRelease {
  return {
    releasedAtMs: nowMs,
    releasedUntilMs: checkpointResetBoundaryMs(nowMs, settings?.resetHourLocal),
    releasedByUserId: releasedByUserId || undefined,
    releasedBySelf: releasedBySelf === true ? true : undefined,
  };
}

/**
 * True if any exception carries a condition v1 cannot evaluate before a page
 * loads. Such an exception would silently never match, so the editor warns
 * instead of saving something that looks configured but does nothing.
 */
export function checkpointHasUnsupportedConditions(settings?: CheckpointSettings | null): boolean {
  const exceptions = settings?.exceptions;
  if (!Array.isArray(exceptions)) return false;

  return exceptions.some((exception) =>
    (exception?.conditions || []).some((condition) =>
      CHECKPOINT_CONTENT_SHAPED_CONDITION_TYPES.includes(condition?.type),
    ),
  );
}

/**
 * True when any exception names a Usage Type.
 *
 * This is the switch between two gates, and it is the single most
 * performance-sensitive predicate here:
 *
 *   false — the fast path, and what every existing user gets. The page is
 *           blocked before it loads, nothing is ever briefly visible, and no
 *           classification is awaited.
 *   true  — the opt-in slow path. A page whose Usage Type cannot be resolved
 *           from the address is allowed to load and pulled once classified.
 *
 * Keep it cheap and keep it exact. Widening it to "has any content-shaped
 * condition" would drag users onto the slow path for conditions that can never
 * match anyway.
 */
export function checkpointHasEduValueExceptions(settings?: CheckpointSettings | null): boolean {
  const exceptions = settings?.exceptions;
  if (!Array.isArray(exceptions)) return false;

  return exceptions.some((exception) =>
    (exception?.conditions || []).some(
      (condition) =>
        condition?.type === 'eduValue'
        // A condition left with only the forbidden value is stripped to nothing
        // at match time, so it must not drag anyone onto the slow path either.
        && (condition?.values || []).some((value) => value !== CHECKPOINT_FORBIDDEN_EDU_VALUE),
    ),
  );
}

/**
 * True when tasks have been picked for this check-in, whatever the mode.
 *
 * The DISPLAY question — "is there a task list to show?". Every mode has a use
 * for one: in `self` it gates the button, in `guardian` it tells the child what
 * to do and the approving adult what got done, and in `reminder` it is the
 * checklist behind the nudge.
 *
 * Do not use this to decide whether a clear is allowed — that is
 * `checkpointTaskGateIsActive`.
 */
export function checkpointTaskGateIsConfigured(settings?: CheckpointSettings | null): boolean {
  const taskGate = settings?.taskGate;
  if (taskGate?.enabled !== true) return false;

  return Array.isArray(taskGate.requiredTaskIds) && taskGate.requiredTaskIds.length > 0;
}

/**
 * True when this check-in requires tasks before the user may clear it THEMSELVES.
 *
 * The ENFORCEMENT question, and deliberately narrower than
 * `checkpointTaskGateIsConfigured`: only `self` mode has a self-clear to gate.
 * In `guardian` mode an adult holds the key and their override must stay
 * absolute; in `reminder` mode nothing blocks in the first place. Refusing a
 * clear in either would be a lockout with no way out.
 */
export function checkpointTaskGateIsActive(settings?: CheckpointSettings | null): boolean {
  if (resolveCheckpointMode(settings) !== 'self') return false;
  return checkpointTaskGateIsConfigured(settings);
}
