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

import {
  isDesktopPlatform,
  isDevicePlatform,
  platformPrefixOf,
  toDeviceAppId,
} from 'tset-sharedlib/restrictions/deviceAppIds';
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
/**
 * A computer's Companion closed this many times within `QUIT_STREAK_WINDOW_MS` is someone trying to
 * stop it, and a guardian hears about it. Once is a crash, a dead display or a curious click: it
 * restarts itself in seconds, so it is recorded on the device card and nobody is told (HAT-447).
 */
export const QUIT_STREAK_COUNT = 3;
export const QUIT_STREAK_WINDOW_MS = HOUR;

export type TamperIncident = {
  /** When the device was last known healthy. */
  openedAt: number;
  kind: 'gap' | 'event';
  lastEventKind?: DeviceTamperKind;
  lastNotifiedAt?: number;
  notifyCount: number;
  resolvedAt?: number;
  /**
   * The newest tamper event (`tamper.lastEventAt`) already reported to the parents. Carried into
   * every later incident, including a gap incident and a resolved one, because the device keeps
   * reporting that same event until a newer one replaces it.
   */
  reportedEventAt?: number;
  /**
   * When the Companion was closed (`companionQuit`) within the last `QUIT_STREAK_WINDOW_MS`, not yet
   * told to anyone. Cleared by the alert a streak sends. Carried into every later incident.
   */
  recentQuitAt?: number[];
};

export type DeviceSnapshot = {
  deviceId: string;
  /** The device's own name: a computer's host name. Phones report none. */
  deviceLabel?: string;
  /** From the status row. Absent means Android, as every Guard build before the field. */
  platform?: string;
  provisioned?: boolean;
  /** ref_state row updatedAt — when the device last checked in. */
  lastSeenAt: number | null;
  tamperLastEventAt?: number;
  tamperLastEventKind?: DeviceTamperKind;
};

export type TamperDecision =
  | {action: 'none'; incident?: TamperIncident}
  | {action: 'open'; incident: TamperIncident}
  /** Save the incident and tell nobody: a single close of a computer's Companion (HAT-447). */
  | {action: 'record'; incident: TamperIncident}
  | {action: 'notify'; incident: TamperIncident; urgency: 'immediate' | 'digest'; reason: TamperReason}
  | {action: 'resolve'; incident: TamperIncident; notifyRecovery: boolean};

export type TamperReason =
  | {kind: 'event'; eventKind: DeviceTamperKind}
  | {kind: 'quitStreak'; count: number}
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
  // Every new incident keeps the newest event already reported, whatever kind the incident is.
  const alreadyReported = reportedEventAt(incident);
  const recentQuitAt = incident?.recentQuitAt ?? [];
  const carried = {
    ...(alreadyReported === undefined ? {} : {reportedEventAt: alreadyReported}),
    ...(recentQuitAt.length ? {recentQuitAt} : {}),
  };

  // An explicit tamper event beats everything: the device was still alive when it
  // reported, so this is unambiguous and worth an immediate push.
  if (isNewEvent(snapshot, incident)) {
    const at = snapshot.tamperLastEventAt!;
    const kind = snapshot.tamperLastEventKind;
    const event = {openedAt: at, kind: 'event' as const, lastEventKind: kind, reportedEventAt: at};
    const notified = {lastNotifiedAt: now, notifyCount: (open?.notifyCount ?? 0) + 1};
    // Closed, and back by itself. Only a streak of them is a sign someone is trying (HAT-447).
    if (kind === 'companionQuit') {
      const streak = [...recentQuitAt.filter((quitAt) => quitAt > at - QUIT_STREAK_WINDOW_MS && quitAt < at), at];
      if (streak.length < QUIT_STREAK_COUNT) {
        return {action: 'record', incident: {...event, notifyCount: open?.notifyCount ?? 0, recentQuitAt: streak}};
      }
      // The alert spends the streak: the next one takes three more.
      return {
        action: 'notify',
        incident: {...event, ...notified},
        urgency: 'immediate',
        reason: {kind: 'quitStreak', count: streak.length},
      };
    }
    return {
      action: 'notify',
      incident: {...event, ...notified, ...(recentQuitAt.length ? {recentQuitAt} : {})},
      urgency: 'immediate',
      reason: {kind: 'event', eventKind: kind ?? 'adminDisabled'},
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
      // "Reporting again" only answers a gap alert. After an event alert the device never stopped
      // reporting, so telling the parent it is "back online" is untrue.
      notifyRecovery: open.kind === 'gap' && open.notifyCount > 0 && !isDesktopPlatform(snapshot.platform),
    };
  }

  if (gap == null) return {action: 'none', incident: incident ?? undefined};

  // A computer that has not checked in is switched off — for a night, or a month in a cupboard. A
  // computer is not tampered with by turning it off, and only what its running Companion reports
  // alerts a guardian (founder, 2026-10-14, HAT-447). A phone stays on, so its silence still counts.
  if (isDesktopPlatform(snapshot.platform)) return {action: 'none', incident: incident ?? undefined};

  // Silent incident: recorded so the clock starts, but the parent hears nothing
  // yet. Most of these close themselves overnight.
  if (!open) {
    if (gap < GAP_FIRST_ALERT_MS) {
      return {action: 'open', incident: {openedAt: snapshot.lastSeenAt!, kind: 'gap', notifyCount: 0, ...carried}};
    }
    // Already past the alert threshold when first observed (e.g. the job was
    // down): open and alert in the same tick rather than waiting another cycle.
    const opened: TamperIncident = {openedAt: snapshot.lastSeenAt!, kind: 'gap', notifyCount: 0, ...carried};
    return gapNotification(opened, gap, now, tzOffsetMinutes);
  }

  if (open.notifyCount >= MAX_NOTIFICATIONS_PER_INCIDENT) return {action: 'none', incident: open};
  return gapNotification(open, gap, now, tzOffsetMinutes);
}

/**
 * The newest tamper event this device's parents were already told about. Rows written before
 * `reportedEventAt` existed fall back to an event incident's `openedAt`, which is that event.
 */
function reportedEventAt(incident: TamperIncident | null): number | undefined {
  if (!incident) return undefined;
  return incident.reportedEventAt ?? (incident.kind === 'event' ? incident.openedAt : undefined);
}

function isNewEvent(snapshot: DeviceSnapshot, incident: TamperIncident | null): boolean {
  const at = snapshot.tamperLastEventAt;
  if (!at) return false;
  // Only fire on an event we haven't already reported: compare against what was
  // reported, not against wall-clock recency, so a replayed heartbeat carrying the
  // same timestamp can't re-alert.
  //
  // Compared against the incident whether or not it is still open. A device keeps sending its
  // last event in every heartbeat, indefinitely. Comparing only against an OPEN incident re-sent
  // the alert after every close: a September 5 "Usage access was turned off" reached a guardian
  // again on September 13, with usage access on (OnePlus 6T, DCP device run).
  const reported = reportedEventAt(incident);
  return reported === undefined || at > reported;
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

/**
 * The app and the kind of device, for copy sent about either (DCP-17). Phones and computers both run
 * Kindredly Companion since the phone app's rename from Kindredly Guard (HAT-086).
 */
function deviceWords(platform: string | undefined): {app: string; short: string; kind: string} {
  return {app: 'Kindredly Companion', short: 'Companion', kind: isDesktopPlatform(platform) ? 'computer' : 'phone'};
}

/**
 * Whose device an alert is about, as a guardian says it: "Emma's computer (sunic)", "Emma's phone".
 * The device's own name follows when it has one — a computer reports its host name, a phone none —
 * so two of Emma's computers can be told apart. Never the device id: "Device lnx-dbf4" is what every
 * alert said, because this read a field no device sends (HAT-195).
 */
export function whoseDevice(input: {
  childName?: string | null;
  deviceLabel?: string | null;
  platform?: string;
}): string {
  const {kind} = deviceWords(input.platform);
  const name = String(input.childName || '').trim();
  const label = String(input.deviceLabel || '').trim();
  const owner = name ? `${name}'s ${kind}` : `a ${kind}`;
  return label && label.toLowerCase() !== kind ? `${owner} (${label})` : owner;
}

/** A title starts with the device, which may be "a computer". */
function startOfTitle(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Parent-facing copy. Kept here so the wording is unit-testable alongside the thresholds.
 * `device` is `whoseDevice`'s answer.
 *
 * Every body names the device as well as the title. The push shows the body under a fixed
 * "Device Protection Alert" title, so a body that said "this computer" told a guardian with two
 * children nothing about whose it was (HAT-447).
 */
export function describeReason(reason: TamperReason, device: string, platform?: string): {title: string; body: string} {
  if (reason.kind === 'quitStreak') {
    return {
      title: `Kindredly keeps being closed on ${device}`,
      body: `Kindredly was closed ${reason.count} times within an hour on ${device}. It restarted itself each time and is protecting again.`,
    };
  }
  if (reason.kind === 'event') {
    const copy = EVENT_COPY[reason.eventKind];
    const body = copy ? copy(device) : `Something changed in the protection settings on ${device}.`;
    return {title: `Protection changed on ${device}`, body};
  }
  const hours = Math.floor(reason.sinceMs / HOUR);
  const since = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
  const words = deviceWords(platform);
  return {
    title: startOfTitle(reason.final ? `${device} still hasn't checked in` : `${device} hasn't checked in`),
    body: `${words.app} on ${device} hasn't reported for ${since}. The ${words.kind} may be off, or ${words.short} may have been removed.`,
  };
}

/**
 * The new-app notice, saying phone or computer from the device whose app list it came from. `listed`
 * is the names already joined and capped by the caller.
 */
/**
 * The "New app" notice. `device` is `whoseDevice`'s answer ("Emma's computer (orbit)"); without it,
 * the child's name and the kind of device.
 *
 * The push shows `title` over `shortMessage`, so the push names the apps (HAT-1016): it used to say
 * "1 new app on Emma's computer." under "New Notification", and a guardian had to open Kindredly to
 * learn which app it was. `steamGame` says the one app is a Steam game, which is the "what is it" a
 * name like "Among Us" does not answer.
 */
export function describeNewApps(input: {
  total: number;
  listed: string;
  childName: string;
  platform?: unknown;
  device?: string;
  steamGame?: boolean;
}): {
  title: string;
  message: string;
  shortMessage: string;
} {
  const {kind} = deviceWords(typeof input.platform === 'string' ? input.platform : undefined);
  const {total, childName} = input;
  const device = String(input.device || '').trim() || `${childName}'s ${kind}`;
  const steam = total === 1 && input.steamGame;
  return {
    title: total === 1 ? `New app on ${device}` : `${total} new apps on ${device}`,
    message: steam
      ? `${input.listed}, a game from Steam, appeared on ${device}.`
      : `${input.listed} appeared on ${device}.`,
    shortMessage: steam ? `${input.listed}, a game from Steam` : input.listed,
  };
}

/** A long app name cut at a word, for a button: "Fortnite Installer for Heroic…". */
function shortName(label: string, max = 32): string {
  if (label.length <= max) return label;
  const cut = label.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,:;(–-]+$/, '')}…`;
}

/**
 * Everything the "New app" notice holds, from what the device reported (HAT-1016).
 *
 * `pkgs` are the ids the device lists its apps by, a Steam game as `steam:<appid>`; `labels` their
 * names, in the same order. The notice carries where it leads: one app opens its own screen on All
 * apps and has Block on the notice; several open All apps, where the new ones come first.
 */
/**
 * Whether the device holds every app it reported for a guardian (New apps start blocked, NAP-6, NAP-8),
 * from the `waiting` list it sent. A device that sends none, an older build, holds none.
 */
export function deviceHoldsAll(pkgs: string[], waiting: unknown): boolean {
  const holding = new Set(Array.isArray(waiting) ? waiting.filter((p): p is string => typeof p === 'string') : []);
  return pkgs.length > 0 && pkgs.every((p) => holding.has(p));
}

export function newAppsNotice(input: {
  childUserId: string;
  childName: string;
  platform?: string;
  device: string;
  pkgs: string[];
  labels: string[];
  maxNamed: number;
  /**
   * New apps start blocked is on and this device blocks them (NAP-6): the notice says the app waits
   * for the guardian, and its button is Allow.
   */
  waiting?: boolean;
}): {
  copy: {title: string; message: string; shortMessage: string};
  path: string;
  appIds: string[];
  actions: Array<{name: string; label: string; data: Record<string, string>}>;
} {
  const total = input.pkgs.length || input.labels.length;
  const shown = (input.labels.length ? input.labels : input.pkgs).slice(0, input.maxNamed);
  const extra = total > shown.length ? ` and ${total - shown.length} more` : '';
  // The id App controls names each app by: a Steam game carries its own prefix.
  const devicePlatform = isDevicePlatform(input.platform) ? input.platform : 'android';
  const appIds = input.pkgs.map((pkg) => (platformPrefixOf(pkg) ? pkg : toDeviceAppId(devicePlatform, pkg)));
  const allApps = `/manage/user/${input.childUserId}/blocked/apps`;
  const copy = describeNewApps({
    total,
    listed: `${shown.join(', ')}${extra}`,
    childName: input.childName,
    platform: input.platform,
    device: input.device,
    steamGame: total === 1 && Boolean(appIds[0]?.startsWith('steam:')),
  });
  if (input.waiting) {
    copy.title = total === 1 ? `New app waiting on ${input.device}` : `${total} new apps waiting on ${input.device}`;
    copy.message = `${copy.message} ${total === 1 ? 'It is blocked until you allow it.' : 'They are blocked until you allow them.'}`;
    copy.shortMessage = `${copy.shortMessage}, blocked until you allow ${total === 1 ? 'it' : 'them'}`;
  }
  if (total !== 1 || !appIds[0]) {
    return {
      copy,
      path: allApps,
      appIds,
      actions: [{name: 'openPath', label: 'See the new apps', data: {path: allApps}}],
    };
  }
  const label = String(input.labels[0] || input.pkgs[0]);
  // The name too: the app may not be in the child's stored list yet, which is where it would come from.
  const path = `${allApps}?app=${encodeURIComponent(appIds[0])}&name=${encodeURIComponent(label)}`;
  return {
    copy,
    path,
    appIds,
    actions: [
      // The name comes from the child's device; the button renders it as text.
      input.waiting
        ? {
            name: 'allowDeviceApp',
            label: `Allow ${shortName(label)}`,
            data: {childUserId: input.childUserId, appId: appIds[0], label},
          }
        : {
            name: 'blockDeviceApp',
            label: `Block ${shortName(label)}`,
            data: {childUserId: input.childUserId, appId: appIds[0], label},
          },
      {name: 'openPath', label: 'Open', data: {path}},
    ],
  };
}

/** Sent when a device that had gone quiet reports again. */
export function describeRecovery(device: string, platform?: string): {title: string; body: string} {
  const words = deviceWords(platform);
  return {
    title: startOfTitle(`${device} is reporting again`),
    body: `${words.app} is back online on ${device}.`,
  };
}

const EVENT_COPY: Record<DeviceTamperKind, (device: string) => string> = {
  adminDisableRequested: (device) => `Someone started turning off uninstall protection on ${device}.`,
  adminDisabled: (device) =>
    `Uninstall protection was turned off on ${device}. Kindredly Companion can now be removed.`,
  screenGuardDisabled: (device) => `Kindredly Companion's accessibility switch was turned off on ${device}.`,
  uninstallScreen: (device) => `Someone opened the screen used to remove apps on ${device}.`,
  // Android's setting name alone told a guardian nothing (founder, 2026-09-14): the effect, then where to fix it.
  usageAccessRevoked: (device) =>
    `Kindredly Companion was turned off in Usage access settings on ${device}, so app time isn't being recorded.`,
  mainAppMissing: (device) => `The Kindredly app was removed from ${device}.`,
  // Desktop. Says what happened AND that it is already fixed, because the alert would otherwise
  // read as "your child's computer is unprotected right now", which it is not.
  companionQuit: (device) => `Kindredly was closed on ${device}. It restarted itself and is protecting again.`,
  // Desktop. Not phrased as an alarm: the overwhelmingly likely reader is the parent who did it,
  // standing at the computer, fixing a rule that was wrong. It still has to be SENT, because from
  // this side a paused Companion and a tampered-with one are indistinguishable — and a parent who
  // did not do this has just learned their PIN is out.
  escapeHatch: (device) => `The admin code paused limits on ${device} for 15 minutes. They come back on their own.`,
  // Linux. Someone tried to stop Kindredly coming back; it still does, and that is said too (CMP-48).
  companionTampered: (device) => `Someone tried to stop Kindredly from restarting on ${device}. It's still running.`,
  // Linux. What was done, and that it is undone (CMP-69).
  linkRemoved: (device) =>
    `Kindredly's link to your family was deleted on ${device}. It put the link back and is protecting again.`,
  stayDownForged: (device) =>
    `Kindredly was kept closed on ${device} for up to 30 minutes without the admin code. It's running again.`,
};
