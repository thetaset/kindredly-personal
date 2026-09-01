/**
 * What an access request is made of, before anything sends it.
 *
 * This lived inside `AccessRequestNew.vue`'s `save()`, which was fine while a browser was the only
 * thing that could file one. The Companion can now file from a blocked Mac with no browser open,
 * and the fields below are not free-form: `key` and `details.expiresAtTs` are a contract with the
 * server's auto-expire sweep (`_autoExpireRequests`), which deletes `status:'requested'` rows whose
 * `expiresAtTs` has passed and falls back to parsing the date back out of a `TIMEREQ_` key. A
 * second implementation that got either shape slightly wrong would not fail loudly — it would file
 * rows that never expire and sit in a parent's inbox forever.
 *
 * So: one builder, both callers.
 *
 * Local-time arithmetic on purpose, and it is load-bearing twice over. "One ask per hour" and "one
 * per day" mean the CHILD's hour and day, and a time request has to die at the midnight they
 * experience rather than at UTC's.
 */
import { checkpointResetBoundaryMs } from './checkpoint';

/** The request types that build a key of their own rather than taking one from the caller. */
export type AccessRequestDraftType = 'url' | 'item' | 'time' | 'checkpoint' | string;

export type AccessRequestDraftInput = {
  type: AccessRequestDraftType;
  /** The URL or item id, for the types that carry one. Ignored by `time` and `checkpoint`. */
  key?: string | null;
  details?: Record<string, any> | null;
  /** Checkpoint reset hour, so a check-in ask expires exactly when the gate itself resets. */
  resetHourLocal?: number;
  /** Injected rather than read, so the same input always produces the same draft in a test. */
  nowMs: number;
};

export type AccessRequestDraft = {
  key: string;
  type: string;
  details: Record<string, any>;
};

export type AccessRequestDraftResult =
  | { ok: true; draft: AccessRequestDraft }
  | { ok: false; error: string };

/** `TIMEREQ_2026-8-21 14:00` — one ask per hour, in the child's own clock. */
export function timeRequestKey(nowMs: number): string {
  const now = new Date(nowMs);
  return `TIMEREQ_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:00`;
}

/**
 * `CHECKPOINT_2026-8-21` — one ask per period.
 *
 * Dated rather than stamped to the hour, deliberately: re-asking updates nothing instead of piling
 * a second row into a parent's inbox for the same morning.
 */
export function checkpointRequestKey(nowMs: number): string {
  const now = new Date(nowMs);
  return `CHECKPOINT_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** Midnight at the end of the child's today. A time request is only ever valid for "today". */
export function nextLocalMidnightMs(nowMs: number): number {
  const now = new Date(nowMs);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
}

export function buildAccessRequestDraft(input: AccessRequestDraftInput): AccessRequestDraftResult {
  const type = input.type || 'url';
  const details: Record<string, any> = input.details ? { ...input.details } : {};
  let key = String(input.key || '').trim();

  if (type === 'url' || type === 'item') {
    // The only user-supplied key, and the only one that can be missing.
    if (key.length === 0) return { ok: false, error: 'Please enter a URL' };
    if (type === 'url') details.url = key;
  } else if (type === 'time') {
    key = timeRequestKey(input.nowMs);
    // Persist an explicit expiry rather than leaving the sweep to parse the key. Both work; only
    // this one keeps working when the key format changes.
    details.expiresAtTs = nextLocalMidnightMs(input.nowMs);
    details.requestedAtTs = input.nowMs;
  } else if (type === 'checkpoint') {
    key = checkpointRequestKey(input.nowMs);
    // Expire the ask when the checkpoint itself resets, so yesterday's request clears with nobody
    // acting on it.
    details.expiresAtTs = checkpointResetBoundaryMs(input.nowMs, input.resetHourLocal);
    details.requestedAtTs = input.nowMs;
  }

  return { ok: true, draft: { key, type, details } };
}
