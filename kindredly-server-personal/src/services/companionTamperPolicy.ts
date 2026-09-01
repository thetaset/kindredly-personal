/**
 * Decides when a parent should be told that a child's Kindredly Guard device has
 * gone quiet or been tampered with.
 *
 * Pure and dependency-free on purpose: the thresholds here are the entire
 * anti-tamper backstop for everything the on-device lock cannot prevent (safe
 * mode, a secondary user profile, factory reset, ADB). All four of those produce
 * exactly one observable — the heartbeat stops — so getting these numbers right
 * matters more than any single piece of native code.
 *
 * The failure mode to design against is not missing a tamper. It is crying wolf:
 * a phone that is simply switched off overnight, in a tunnel, or out of battery
 * looks identical to one that has had Guard ripped off it. Alert too eagerly and
 * parents learn to ignore us, at which point the real alert is worthless too.
 */

import {DEVICE_GUARD_QUIET_GAP_MS} from 'tset-sharedlib/types/device-guard.types';
import type {DeviceTamperKind} from 'tset-sharedlib/types/device-guard.types';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * WorkManager periodic work routinely stretches from its 15-minute period to
 * well over an hour under Doze, so anything below ~6h is noise, not signal.
 *
 * Shared with the parent-facing device card, which used to contradict this with
 * a local 1h threshold and flagged healthy phones as "not reporting".
 */
export const GAP_OPEN_INCIDENT_MS = DEVICE_GUARD_QUIET_GAP_MS;
/** First notification. 12h clears a 21:00→07:00 overnight (10h) with margin. */
export const GAP_FIRST_ALERT_MS = 12 * HOUR;
/** Second and final notification. */
export const GAP_FINAL_ALERT_MS = 48 * HOUR;
/** Never more than this many notifications for one incident, ever. */
export const MAX_NOTIFICATIONS_PER_INCIDENT = 2;
/** Local hour at which batched gap alerts are delivered. */
export const DIGEST_HOUR_LOCAL = 9;

export type TamperIncident = {
  /** When the device was last known healthy. */
  openedAt: number;
  kind: 'gap' | 'event';
  lastEventKind?: DeviceTamperKind;
  lastNotifiedAt?: number;
  notifyCount: number;
  resolvedAt?: number;
};

export type DeviceSnapshot = {
  deviceId: string;
  /** Parent-visible device name, for the message. */
  deviceLabel?: string;
  provisioned?: boolean;
  /** ref_state row updatedAt — when the device last checked in. */
  lastSeenAt: number | null;
  tamperLastEventAt?: number;
  tamperLastEventKind?: DeviceTamperKind;
};

export type TamperDecision =
  | {action: 'none'; incident?: TamperIncident}
  | {action: 'open'; incident: TamperIncident}
  | {action: 'notify'; incident: TamperIncident; urgency: 'immediate' | 'digest'; reason: TamperReason}
  | {action: 'resolve'; incident: TamperIncident; notifyRecovery: boolean};

export type TamperReason =
  | {kind: 'event'; eventKind: DeviceTamperKind}
  | {kind: 'gap'; sinceMs: number; final: boolean};

/**
 * Decide what to do about one device on one tick.
 *
 * @param now caller-supplied so this is deterministic under test.
 * @param tzOffsetMinutes the family's local offset (minutes to ADD to UTC), for digest timing.
 */
export function evaluateDevice(
  snapshot: DeviceSnapshot,
  incident: TamperIncident | null,
  now: number,
  tzOffsetMinutes = 0,
): TamperDecision {
  // Never alert about a device that was never linked — an abandoned half-setup
  // is not a tamper, and nagging about it trains parents to dismiss us.
  if (snapshot.provisioned !== true) return {action: 'none', incident: incident ?? undefined};

  const open = incident && !incident.resolvedAt ? incident : null;

  // An explicit tamper event beats everything: the device was still alive when it
  // reported, so this is unambiguous and worth an immediate push.
  if (isNewEvent(snapshot, open)) {
    const next: TamperIncident = {
      openedAt: snapshot.tamperLastEventAt!,
      kind: 'event',
      lastEventKind: snapshot.tamperLastEventKind,
      lastNotifiedAt: now,
      notifyCount: (open?.notifyCount ?? 0) + 1,
    };
    return {
      action: 'notify',
      incident: next,
      urgency: 'immediate',
      reason: {kind: 'event', eventKind: snapshot.tamperLastEventKind ?? 'adminDisabled'},
    };
  }

  const gap = snapshot.lastSeenAt == null ? null : now - snapshot.lastSeenAt;

  // Checked in recently. Close any open incident; only mention recovery if we
  // actually worried the parent earlier.
  if (gap != null && gap < GAP_OPEN_INCIDENT_MS) {
    if (!open) return {action: 'none'};
    return {
      action: 'resolve',
      incident: {...open, resolvedAt: now},
      notifyRecovery: open.notifyCount > 0,
    };
  }

  if (gap == null) return {action: 'none', incident: incident ?? undefined};

  // Silent incident: recorded so the clock starts, but the parent hears nothing
  // yet. Most of these close themselves overnight.
  if (!open) {
    if (gap < GAP_FIRST_ALERT_MS) {
      return {action: 'open', incident: {openedAt: snapshot.lastSeenAt!, kind: 'gap', notifyCount: 0}};
    }
    // Already past the alert threshold when first observed (e.g. the job was
    // down): open and alert in the same tick rather than waiting another cycle.
    const opened: TamperIncident = {openedAt: snapshot.lastSeenAt!, kind: 'gap', notifyCount: 0};
    return gapNotification(opened, gap, now, tzOffsetMinutes);
  }

  if (open.notifyCount >= MAX_NOTIFICATIONS_PER_INCIDENT) return {action: 'none', incident: open};
  return gapNotification(open, gap, now, tzOffsetMinutes);
}

function isNewEvent(snapshot: DeviceSnapshot, open: TamperIncident | null): boolean {
  const at = snapshot.tamperLastEventAt;
  if (!at) return false;
  // Only fire on an event we haven't already reported: compare against the
  // incident we opened for it, not against wall-clock recency, so a replayed
  // heartbeat carrying the same timestamp can't re-alert.
  if (!open) return true;
  return open.kind !== 'event' || at > open.openedAt;
}

function gapNotification(incident: TamperIncident, gap: number, now: number, tzOffsetMinutes: number): TamperDecision {
  const wantFirst = gap >= GAP_FIRST_ALERT_MS && incident.notifyCount === 0;
  const wantFinal = gap >= GAP_FINAL_ALERT_MS && incident.notifyCount === 1;
  if (!wantFirst && !wantFinal) return {action: 'none', incident};

  // Gap alerts are never urgent — the device has already been gone for half a
  // day. Hold them for the morning digest so a parent gets them when they can
  // actually do something, rather than at 3am.
  if (!isDigestWindow(now, tzOffsetMinutes)) return {action: 'none', incident};

  return {
    action: 'notify',
    incident: {...incident, lastNotifiedAt: now, notifyCount: incident.notifyCount + 1},
    urgency: 'digest',
    reason: {kind: 'gap', sinceMs: gap, final: wantFinal},
  };
}

/**
 * True during the digest hour in the family's local time. The watch job ticks
 * every 30 minutes, so a one-hour window is hit reliably without needing exact
 * scheduling — and the notifyCount cap stops the second tick double-sending.
 */
export function isDigestWindow(now: number, tzOffsetMinutes: number): boolean {
  const localHour = Math.floor(((now + tzOffsetMinutes * MINUTE) % (24 * HOUR)) / HOUR);
  return localHour === DIGEST_HOUR_LOCAL;
}

/**
 * True when every provisioned device on the account is silent — a family on
 * holiday with the phones in a drawer, not a child stripping protection. One
 * quiet device is a signal; all of them at once is a lifestyle.
 */
export function accountIsDark(snapshots: DeviceSnapshot[], now: number): boolean {
  const linked = snapshots.filter((s) => s.provisioned === true);
  if (linked.length < 2) return false;
  return linked.every((s) => s.lastSeenAt == null || now - s.lastSeenAt >= GAP_OPEN_INCIDENT_MS);
}

/** Parent-facing copy. Kept here so the wording is unit-testable alongside the thresholds. */
export function describeReason(reason: TamperReason, deviceLabel: string): {title: string; body: string} {
  if (reason.kind === 'event') {
    const body = EVENT_COPY[reason.eventKind] ?? 'Something changed in the protection settings.';
    return {title: `Protection changed on ${deviceLabel}`, body};
  }
  const hours = Math.floor(reason.sinceMs / HOUR);
  const since = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
  return {
    title: reason.final ? `${deviceLabel} still hasn't checked in` : `${deviceLabel} hasn't checked in`,
    body: `Kindredly Guard hasn't reported for ${since}. The phone may be off, or Guard may have been removed.`,
  };
}

const EVENT_COPY: Record<DeviceTamperKind, string> = {
  adminDisableRequested: 'Someone started turning off uninstall protection.',
  adminDisabled: 'Uninstall protection was turned off. Guard can now be removed.',
  screenGuardDisabled: 'The screen guard was switched off in accessibility settings.',
  uninstallScreen: 'Someone opened the screen used to remove apps.',
  usageAccessRevoked: "Usage access was turned off, so app time isn't being recorded.",
  mainAppMissing: 'The Kindredly app was removed from the phone.',
  // Desktop. Says what happened AND that it is already fixed, because the alert would otherwise
  // read as "your child's computer is unprotected right now", which it is not.
  companionQuit: 'Kindredly was closed on this computer. It restarted itself and is protecting again.',
  // Desktop. Not phrased as an alarm: the overwhelmingly likely reader is the parent who did it,
  // standing at the computer, fixing a rule that was wrong. It still has to be SENT, because from
  // this side a paused Companion and a tampered-with one are indistinguishable — and a parent who
  // did not do this has just learned their PIN is out.
  escapeHatch: 'A parent PIN paused limits on this computer for 15 minutes. They come back on their own.',
};
