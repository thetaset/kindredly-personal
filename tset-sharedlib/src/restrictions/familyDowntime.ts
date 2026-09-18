/**
 * Family Downtime: one family-wide schedule that locks screens and apps for everyone, admins
 * included, on top of every other limit.
 *
 * Stored on the ACCOUNT (`account.options.familyDowntime`), not on each user, because it is one
 * setting for the whole family and only an admin may change it. Not encrypted: when screens go off
 * is not sensitive, and every device has to read it.
 *
 * It is its own layer, never written into anyone's usage rules. Extra time replaces a rule's limit
 * for today wholesale (`applyOverrides`), so a downtime stored as a rule window would be undone by
 * the first grant of bonus time. Keeping it apart is what lets it override extra time, a pause and
 * temporary access, and also what keeps it additive: ending it early never lifts anyone's own
 * allowed hours, because it never touched them.
 *
 * Everything here is pure and works in the FAMILY's timezone, correct on the days clocks change.
 * The browser, the server and the desktop Companion call these functions directly; phones receive
 * the resulting start and end times from the server, so no other language has to re-implement the
 * midnight and daylight-saving rules.
 */

import { familyClock, isKnownTimeZone } from '../deviceguard/familyClock'
import { timeZoneOffsetMinutes } from '../deviceguard/compileDeviceSettings'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

/** A one-off may not run longer than this. A slipped date should not lock a family for a month. */
export const FAMILY_DOWNTIME_ONE_OFF_MAX_MS = 14 * DAY_MS
export const FAMILY_DOWNTIME_ONE_OFF_MAX = 20
export const FAMILY_DOWNTIME_ALLOW_MAX = 50
const ALLOW_ENTRY_MAX_LENGTH = 300

/**
 * A recurring window. `start` and `end` are `HH:MM` wall-clock times in the family timezone.
 *
 * An `end` at or before `start` ends the next morning, and the window belongs to the day it STARTS
 * on: `{daysOfWeek:[0], start:'21:00', end:'07:00'}` is Sunday night into Monday morning. Each
 * weekday belongs to at most one schedule, as in the usage limits editor.
 */
export type FamilyDowntimeSchedule = {
  id: string
  daysOfWeek: number[]
  start: string
  end: string
}

/** "Start now" and planned one-offs. Absolute epoch ms, so a one-off can cover a weekend away. */
export type FamilyDowntimeOneOff = {
  id: string
  startAt: number
  endAt: number
  createdBy: string
}

/**
 * A stretch the recurring schedule does not cover: "End now" (from the moment it was ended to the
 * end of that night's window) or "Skip tonight" (one whole occurrence).
 *
 * Applies to recurring windows only. End now shortens a running one-off directly instead, so a
 * one-off added later the same night is not silently swallowed by an earlier End now.
 */
export type FamilyDowntimeException = {
  fromMs: number
  untilMs: number
  kind: 'ended' | 'skipped'
  byUserId: string
}

/**
 * An admin dismissed downtime for themselves, until the downtime they dismissed ends. A write that
 * shortens or ends that downtime shortens or drops this too (`keepDismissalsWithinDowntime`), so it
 * never carries over to a downtime that starts afterwards.
 */
export type FamilyDowntimeDismissal = {
  userId: string
  untilMs: number
}

/** What stays open during downtime, on top of each device's own safety floor. */
export type FamilyDowntimeAllow = {
  urlPatterns: string[]
  itemIds: string[]
  /** `<platform>:<id>` device app ids, as custom limits store them. */
  appIds: string[]
}

export type FamilyDowntimeSettings = {
  /** Whether the recurring schedules apply. One-offs apply either way; an admin started them. */
  enabled: boolean
  schedules: FamilyDowntimeSchedule[]
  oneOffs: FamilyDowntimeOneOff[]
  exceptions: FamilyDowntimeException[]
  dismissals: FamilyDowntimeDismissal[]
  allow: FamilyDowntimeAllow
  updatedAt: number
  updatedBy: string
}

/** A stretch of downtime. `endMs` is exclusive: at exactly `endMs` it is over. */
export type DowntimeInterval = { startMs: number; endMs: number }

export function emptyFamilyDowntime(): FamilyDowntimeSettings {
  return {
    enabled: false,
    schedules: [],
    oneOffs: [],
    exceptions: [],
    dismissals: [],
    allow: { urlPatterns: [], itemIds: [], appIds: [] },
    updatedAt: 0,
    updatedBy: '',
  }
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidDowntimeClock(value: unknown): value is string {
  return typeof value === 'string' && HHMM.test(value)
}

function clockMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function text(value: unknown, max = ALLOW_ENTRY_MAX_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function stringList(raw: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of Array.isArray(raw) ? raw : []) {
    const entry = text(value)
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    out.push(entry)
    if (out.length >= FAMILY_DOWNTIME_ALLOW_MAX) break
  }
  return out
}

/**
 * Whatever is stored, in today's shape.
 *
 * Drops what cannot be enforced rather than refusing the whole record: a schedule with no days, a
 * clock that is not `HH:MM`, a window that starts and ends at the same minute, a one-off that ends
 * before it starts or runs longer than 14 days. A weekday already claimed by an earlier schedule is
 * removed from the later one, so the first schedule wins and no day is covered twice.
 */
export function normalizeFamilyDowntime(raw: unknown): FamilyDowntimeSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out = emptyFamilyDowntime()

  out.enabled = input.enabled === true

  const claimedDays = new Set<number>()
  const scheduleIds = new Set<string>()
  for (const [index, value] of (Array.isArray(input.schedules) ? input.schedules : []).entries()) {
    const s = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    if (!isValidDowntimeClock(s.start) || !isValidDowntimeClock(s.end) || s.start === s.end) continue
    const days = [...new Set((Array.isArray(s.daysOfWeek) ? s.daysOfWeek : [])
      .filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))]
      .filter((d) => !claimedDays.has(d))
      .sort((a, b) => a - b)
    if (!days.length) continue
    let id = text(s.id, 64) || `schedule-${index + 1}`
    if (scheduleIds.has(id)) id = `${id}-${index + 1}`
    scheduleIds.add(id)
    days.forEach((d) => claimedDays.add(d))
    out.schedules.push({ id, daysOfWeek: days, start: s.start, end: s.end })
  }

  const oneOffIds = new Set<string>()
  for (const [index, value] of (Array.isArray(input.oneOffs) ? input.oneOffs : []).entries()) {
    const o = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    if (!finite(o.startAt) || !finite(o.endAt)) continue
    if (o.endAt <= o.startAt || o.endAt - o.startAt > FAMILY_DOWNTIME_ONE_OFF_MAX_MS) continue
    let id = text(o.id, 64) || `one-off-${index + 1}`
    if (oneOffIds.has(id)) id = `${id}-${index + 1}`
    oneOffIds.add(id)
    out.oneOffs.push({ id, startAt: o.startAt, endAt: o.endAt, createdBy: text(o.createdBy, 64) })
    if (out.oneOffs.length >= FAMILY_DOWNTIME_ONE_OFF_MAX) break
  }
  out.oneOffs.sort((a, b) => a.startAt - b.startAt)

  for (const value of Array.isArray(input.exceptions) ? input.exceptions : []) {
    const e = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    if (!finite(e.fromMs) || !finite(e.untilMs) || e.untilMs <= e.fromMs) continue
    const kind = e.kind === 'skipped' ? 'skipped' : 'ended'
    out.exceptions.push({ fromMs: e.fromMs, untilMs: e.untilMs, kind, byUserId: text(e.byUserId, 64) })
  }

  const dismissedBy = new Map<string, number>()
  for (const value of Array.isArray(input.dismissals) ? input.dismissals : []) {
    const d = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    const userId = text(d.userId, 64)
    if (!userId || !finite(d.untilMs)) continue
    // One per person: the latest wins, so a second dismissal extends rather than duplicates.
    dismissedBy.set(userId, Math.max(dismissedBy.get(userId) ?? 0, d.untilMs))
  }
  out.dismissals = [...dismissedBy].map(([userId, untilMs]) => ({ userId, untilMs }))

  const allow = input.allow && typeof input.allow === 'object' ? (input.allow as Record<string, unknown>) : {}
  out.allow = {
    urlPatterns: stringList(allow.urlPatterns),
    itemIds: stringList(allow.itemIds),
    appIds: stringList(allow.appIds),
  }

  out.updatedAt = finite(input.updatedAt) ? input.updatedAt : 0
  out.updatedBy = text(input.updatedBy, 64)
  return out
}

/**
 * Drop what can no longer change anything: one-offs, exceptions and dismissals that have ended.
 * Run on every write so the record does not grow without bound.
 */
export function pruneFamilyDowntime(settings: FamilyDowntimeSettings, nowMs: number): FamilyDowntimeSettings {
  return {
    ...settings,
    oneOffs: settings.oneOffs.filter((o) => o.endAt > nowMs),
    exceptions: settings.exceptions.filter((e) => e.untilMs > nowMs),
    dismissals: settings.dismissals.filter((d) => d.untilMs > nowMs),
  }
}

/**
 * Why a one-off cannot be saved, in words for the person picking the times, or null when it can.
 * The client says it before sending; the server refuses with the same sentence.
 */
export function oneOffProblem(startAt: number, endAt: number, nowMs: number): string | null {
  if (!finite(startAt) || !finite(endAt)) return 'Pick a start and an end.'
  if (endAt <= startAt) return 'The end has to be after the start.'
  if (endAt <= nowMs) return 'That time has already passed.'
  if (endAt - startAt > FAMILY_DOWNTIME_ONE_OFF_MAX_MS) return 'A one-off can last up to 14 days.'
  return null
}

// ── Time in the family zone ───────────────────────────────────────────────────────────────────

function offsetMinutesAt(ms: number, timeZone: string | null): number {
  return timeZone ? timeZoneOffsetMinutes(ms, timeZone) : -new Date(ms).getTimezoneOffset()
}

/**
 * The instant a wall-clock time happens in `timeZone` (the device's own zone when there is none).
 *
 * On the day clocks change a wall-clock time can happen twice or not at all. Twice (the hour clocks
 * go back): the earlier one, so a window starts as early as it says. Not at all (the hour clocks
 * skip): the moment it would have been on the old offset, which reads an hour later, so 02:30 on a
 * spring-forward night starts at 03:30 rather than being lost.
 */
export function zonedWallTimeToEpochMs(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string | null | undefined,
): number {
  const zone = isKnownTimeZone(timeZone) ? timeZone : null
  const localAsUtc = Date.UTC(year, monthIndex, day, hour, minute)
  const before = offsetMinutesAt(localAsUtc - DAY_MS, zone)
  const after = offsetMinutesAt(localAsUtc + DAY_MS, zone)
  const valid = [before, after]
    .map((offset) => localAsUtc - offset * MINUTE_MS)
    .filter((candidate, i) => offsetMinutesAt(candidate, zone) === [before, after][i])
  if (valid.length) return Math.min(...valid)
  return localAsUtc - before * MINUTE_MS
}

type CalendarDate = { year: number; monthIndex: number; day: number; weekday: number }

function familyDate(ms: number, timeZone: string | null | undefined): CalendarDate {
  const [year, month, day] = familyClock(ms, timeZone).dateKey.split('-').map(Number)
  return addDays({ year, monthIndex: month - 1, day, weekday: 0 }, 0)
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.monthIndex, date.day + days))
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay() }
}

function wallTime(date: CalendarDate, hhmm: string, timeZone: string | null | undefined): number {
  const minutes = clockMinutes(hhmm)
  return zonedWallTimeToEpochMs(date.year, date.monthIndex, date.day, Math.floor(minutes / 60), minutes % 60, timeZone)
}

// ── Expanding the schedule into actual times ──────────────────────────────────────────────────

/** Each recurring window overlapping `[fromMs, toMs)`, before exceptions. */
function recurringOccurrences(
  settings: FamilyDowntimeSettings,
  fromMs: number,
  toMs: number,
  timeZone: string | null | undefined,
): DowntimeInterval[] {
  if (!settings.enabled || !settings.schedules.length || toMs <= fromMs) return []
  const out: DowntimeInterval[] = []
  // A window can start the evening before `fromMs` and still be running at it.
  let date = addDays(familyDate(fromMs, timeZone), -1)
  const lastDate = familyDate(toMs, timeZone)
  const lastKey = Date.UTC(lastDate.year, lastDate.monthIndex, lastDate.day)
  while (Date.UTC(date.year, date.monthIndex, date.day) <= lastKey) {
    for (const schedule of settings.schedules) {
      if (!schedule.daysOfWeek.includes(date.weekday)) continue
      const startMs = wallTime(date, schedule.start, timeZone)
      const endsNextDay = clockMinutes(schedule.end) <= clockMinutes(schedule.start)
      const endMs = wallTime(endsNextDay ? addDays(date, 1) : date, schedule.end, timeZone)
      if (endMs > startMs && endMs > fromMs && startMs < toMs) out.push({ startMs, endMs })
    }
    date = addDays(date, 1)
  }
  return out
}

function subtract(interval: DowntimeInterval, cut: { fromMs: number; untilMs: number }): DowntimeInterval[] {
  if (cut.untilMs <= interval.startMs || cut.fromMs >= interval.endMs) return [interval]
  const pieces: DowntimeInterval[] = []
  if (cut.fromMs > interval.startMs) pieces.push({ startMs: interval.startMs, endMs: cut.fromMs })
  if (cut.untilMs < interval.endMs) pieces.push({ startMs: cut.untilMs, endMs: interval.endMs })
  return pieces
}

function merge(intervals: DowntimeInterval[]): DowntimeInterval[] {
  const sorted = intervals.filter((i) => i.endMs > i.startMs).sort((a, b) => a.startMs - b.startMs)
  const out: DowntimeInterval[] = []
  for (const interval of sorted) {
    const last = out[out.length - 1]
    // Touching counts: 07:00 → 09:00 straight after 21:00 → 07:00 is one downtime, not two.
    if (last && interval.startMs <= last.endMs) last.endMs = Math.max(last.endMs, interval.endMs)
    else out.push({ ...interval })
  }
  return out
}

/**
 * Every stretch of downtime overlapping `[fromMs, toMs)`, merged, in time order.
 *
 * Not clipped to the range: a downtime that began before `fromMs` keeps its real start (as far back
 * as the evening before `fromMs`) and one running past `toMs` keeps its real end.
 */
export function expandFamilyDowntimeIntervals(
  settings: FamilyDowntimeSettings,
  fromMs: number,
  toMs: number,
  timeZone: string | null | undefined,
): DowntimeInterval[] {
  let recurring = recurringOccurrences(settings, fromMs, toMs, timeZone)
  for (const exception of settings.exceptions) {
    recurring = recurring.flatMap((interval) => subtract(interval, exception))
  }
  const oneOffs = settings.oneOffs
    .filter((o) => o.endAt > fromMs && o.startAt < toMs)
    .map((o) => ({ startMs: o.startAt, endMs: o.endAt }))
  return merge([...recurring, ...oneOffs])
}

/** How far ahead "the next downtime" is looked for. Past this, nothing is coming up. */
export const FAMILY_DOWNTIME_LOOKAHEAD_MS = 15 * DAY_MS

export type FamilyDowntimeState = {
  /** Downtime is on for the family right now. */
  active: boolean
  /** When the current downtime began and ends. Null when it is not on. */
  startedAtMs: number | null
  endsAtMs: number | null
  /** The next downtime after now (after the current one, when one is on). */
  nextStartMs: number | null
  nextEndMs: number | null
  /** This person dismissed it for themselves, and the dismissal covers now. */
  dismissedForUser: boolean
  dismissedUntilMs: number | null
  /** What enforcement asks: is THIS person locked right now. */
  lockedForUser: boolean
  /**
   * The next moment any of the above changes: the current downtime ending, the next one starting, or
   * this person's dismissal running out. A timer set for this instant is the only timer needed.
   */
  nextChangeMs: number | null
}

/**
 * Is downtime on right now, and is this person locked by it?
 *
 * `userId` is only for dismissals. Whether a person may dismiss (admins only) is decided when the
 * dismissal is written, not here.
 */
export function resolveFamilyDowntime(
  settings: FamilyDowntimeSettings | null | undefined,
  nowMs: number,
  timeZone: string | null | undefined,
  userId?: string | null,
): FamilyDowntimeState {
  const intervals = settings
    ? expandFamilyDowntimeIntervals(settings, nowMs, nowMs + FAMILY_DOWNTIME_LOOKAHEAD_MS, timeZone)
    : []
  return familyDowntimeStateAt(intervals, settings?.dismissals || [], nowMs, userId)
}

/**
 * The same answer as `resolveFamilyDowntime`, from intervals already expanded.
 *
 * For a caller on a hot path (every navigation) that expands once and asks many times. The intervals
 * must reach at least `FAMILY_DOWNTIME_LOOKAHEAD_MS` past `nowMs` for "next" to be complete.
 */
export function familyDowntimeStateAt(
  intervals: readonly DowntimeInterval[],
  dismissals: readonly FamilyDowntimeDismissal[],
  nowMs: number,
  userId?: string | null,
): FamilyDowntimeState {
  const current = intervals.find((i) => i.startMs <= nowMs && nowMs < i.endMs) || null
  const next = intervals.find((i) => i.startMs > nowMs) || null
  // Not tied to where `intervals` happen to start: a caller may have expanded them from any point, and
  // a long downtime's first piece may already be gone. Writes keep `untilMs` inside its downtime.
  const dismissal = userId && current
    ? dismissals.find((d) => d.userId === userId && d.untilMs > nowMs) || null
    : null
  const dismissedForUser = !!dismissal

  const changes = [current?.endMs, next?.startMs, dismissedForUser ? dismissal!.untilMs : undefined]
    .filter((ms): ms is number => typeof ms === 'number' && ms > nowMs)

  return {
    active: !!current,
    startedAtMs: current?.startMs ?? null,
    endsAtMs: current?.endMs ?? null,
    nextStartMs: next?.startMs ?? null,
    nextEndMs: next?.endMs ?? null,
    dismissedForUser,
    dismissedUntilMs: dismissedForUser ? dismissal!.untilMs : null,
    lockedForUser: !!current && !dismissedForUser,
    nextChangeMs: changes.length ? Math.min(...changes) : null,
  }
}

/**
 * `calm.com` → site `calm.com`; `*.calm.com` and `.calm.com` the same; `https://www.pbskids.org/games/`
 * → site `pbskids.org`, path `/games`; `youtube.com/watch?v=abc` → also query `v=abc`.
 */
function allowedSite(pattern: string): { host: string; path: string; query: [string, string][] } | null {
  const text = pattern.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const cut = text.search(/[/?#]/)
  const host = (cut < 0 ? text : text.slice(0, cut))
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^\*?\./, '')
    .replace(/^www\./, '')
  if (!host || /\s/.test(host)) return null
  const rest = cut < 0 ? '' : text.slice(cut).replace(/#.*$/, '')
  const q = rest.indexOf('?')
  const path = (q < 0 ? rest : rest.slice(0, q)).toLowerCase().replace(/\/+$/, '')
  const query = q < 0 ? [] : [...new URLSearchParams(rest.slice(q + 1))]
  return { host, path, query }
}

/**
 * Does the family allowlist leave this open during downtime?
 *
 * A site matches by its name, never as a piece of the address: `calm.com` opens `calm.com` and
 * `www.calm.com/sleep`, but not `notcalm.com` or `tiktok.com/?calm.com`, which a child could type to
 * get past downtime. An entry with a path (`pbskids.org/games`) opens only pages under it, and one with
 * a query (`youtube.com/watch?v=abc`) only addresses carrying it, so one allowed video is not all of
 * them. A library item matches by id, which only a Kindredly page showing that item can supply.
 */
export function isAllowedDuringDowntime(
  allow: FamilyDowntimeAllow | null | undefined,
  target: { url?: string | null; itemId?: string | null },
): boolean {
  if (!allow) return false
  if (target.itemId && allow.itemIds.includes(target.itemId)) return true
  let url: URL
  try {
    url = new URL(target.url || '')
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const pathname = url.pathname.toLowerCase().replace(/\/+$/, '')
  return allow.urlPatterns.some((pattern) => {
    const site = allowedSite(pattern)
    if (!site || (host !== site.host && !host.endsWith(`.${site.host}`))) return false
    if (site.path && pathname !== site.path && !pathname.startsWith(`${site.path}/`)) return false
    // The first value, the one a site reads: `watch?v=OTHER&v=abc` plays OTHER, so it must not match `v=abc`.
    return site.query.every(([key, value]) => url.searchParams.get(key) === value)
  })
}

/** One person's downtime as a page shows and enforces it: the state, plus what stays open. */
export type FamilyDowntimeView = FamilyDowntimeState & {
  allow: FamilyDowntimeAllow
  /** Anything to enforce or show at all: on now, or coming up within the lookahead. */
  scheduled: boolean
}

/** What an access check reports about downtime, so a page can time its next check to the boundary. */
export type FamilyDowntimeAdvisory = Pick<
  FamilyDowntimeState,
  'active' | 'lockedForUser' | 'endsAtMs' | 'nextStartMs' | 'nextChangeMs'
>

/** How far ahead a device is sent actual downtime times. It asks again well before they run out. */
export const FAMILY_DOWNTIME_DEVICE_HORIZON_MS = 28 * DAY_MS

/**
 * What a phone or computer needs to enforce downtime with no network: the actual start and end of
 * every downtime in the next 28 days, and the apps that stay open. No schedule, no timezone, no
 * dismissals (a device app is only ever linked to a child, and children cannot dismiss).
 */
export function familyDowntimeForDevice(
  settings: FamilyDowntimeSettings,
  nowMs: number,
  timeZone: string | null | undefined,
): { intervals: DowntimeInterval[]; horizonEndMs: number; allowAppIds: string[] } {
  const horizonEndMs = nowMs + FAMILY_DOWNTIME_DEVICE_HORIZON_MS
  return {
    intervals: expandFamilyDowntimeIntervals(settings, nowMs, horizonEndMs, timeZone).filter((i) => i.endMs > nowMs),
    horizonEndMs,
    allowAppIds: [...settings.allow.appIds],
  }
}

// ── The admin actions, as pure edits ──────────────────────────────────────────────────────────

/**
 * End now: end the whole downtime running at `nowMs`, as far as the "until" everyone is shown. A
 * one-off running now stops now, a one-off planned inside that stretch is removed, and the recurring
 * windows in it are cut from now to its end. A one-off added afterwards still applies. Does nothing
 * when downtime is not on.
 */
export function endFamilyDowntimeNow(
  settings: FamilyDowntimeSettings,
  nowMs: number,
  timeZone: string | null | undefined,
  byUserId: string,
): FamilyDowntimeSettings {
  const state = resolveFamilyDowntime(settings, nowMs, timeZone)
  if (!state.active || state.endsAtMs == null) return settings
  const endsAtMs = state.endsAtMs

  // Anything overlapping [now, end) is part of this stretch, since the stretch is already merged.
  const oneOffs = settings.oneOffs
    .map((o) => (o.startAt < endsAtMs && o.endAt > nowMs ? { ...o, endAt: nowMs } : o))
    .filter((o) => o.endAt > o.startAt)

  const recurringInside = expandFamilyDowntimeIntervals({ ...settings, oneOffs: [] }, nowMs, endsAtMs, timeZone).length > 0
  const exceptions = recurringInside
    ? [...settings.exceptions, { fromMs: nowMs, untilMs: endsAtMs, kind: 'ended' as const, byUserId }]
    : settings.exceptions

  // Every dismissal was for the downtime that just ended.
  return { ...settings, oneOffs, exceptions, dismissals: [] }
}

/**
 * Keep each dismissal inside the downtime running now: shorten it to that downtime's end, or drop it
 * when downtime is not on. Run after every write, because End now, removing a one-off or changing a
 * schedule can end the dismissed downtime early, and a dismissal left running to its old end would
 * release that admin from a downtime started afterwards (End now, then Start now).
 */
export function keepDismissalsWithinDowntime(
  settings: FamilyDowntimeSettings,
  nowMs: number,
  timeZone: string | null | undefined,
): FamilyDowntimeSettings {
  if (!settings.dismissals.length) return settings
  const state = resolveFamilyDowntime({ ...settings, dismissals: [] }, nowMs, timeZone)
  const endsAtMs = state.active ? state.endsAtMs : null
  const dismissals = endsAtMs == null
    ? []
    : settings.dismissals
      .filter((d) => d.untilMs > nowMs)
      .map((d) => ({ ...d, untilMs: Math.min(d.untilMs, endsAtMs) }))
  return { ...settings, dismissals }
}

/**
 * Skip the next recurring window that has not started yet. Returns the settings unchanged when no
 * recurring window starts within the lookahead.
 */
export function skipNextFamilyDowntime(
  settings: FamilyDowntimeSettings,
  nowMs: number,
  timeZone: string | null | undefined,
  byUserId: string,
): FamilyDowntimeSettings {
  const withoutOneOffs = { ...settings, oneOffs: [] }
  const next = expandFamilyDowntimeIntervals(withoutOneOffs, nowMs, nowMs + FAMILY_DOWNTIME_LOOKAHEAD_MS, timeZone)
    .find((i) => i.startMs > nowMs)
  if (!next) return settings
  return {
    ...settings,
    exceptions: [...settings.exceptions, { fromMs: next.startMs, untilMs: next.endMs, kind: 'skipped', byUserId }],
  }
}

/**
 * Dismiss for me: until the downtime running now ends. Does nothing when it is not on, so a
 * dismissal can never be banked in advance.
 */
export function dismissFamilyDowntimeForUser(
  settings: FamilyDowntimeSettings,
  nowMs: number,
  timeZone: string | null | undefined,
  userId: string,
): FamilyDowntimeSettings {
  const state = resolveFamilyDowntime(settings, nowMs, timeZone)
  if (!state.active || state.endsAtMs == null) return settings
  const dismissals = settings.dismissals.filter((d) => d.userId !== userId)
  dismissals.push({ userId, untilMs: state.endsAtMs })
  return { ...settings, dismissals }
}
