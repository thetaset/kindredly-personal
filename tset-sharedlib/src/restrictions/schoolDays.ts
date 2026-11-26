/**
 * School days (HAT-1283): the days of the week the family's children do school, minus breaks and
 * days off. One setting for the whole family, the same for every child, whether they go to a
 * school or are taught at home.
 *
 * Stored on the ACCOUNT (`account.options.schoolDays`), as Family Downtime is, because it is one
 * family-wide setting that only an admin changes and every device has to read. Not encrypted: which
 * weekdays are school days, and the dates of a winter break, are not sensitive.
 *
 * A time limit schedule (`TimeLimit`) can be the family's School days or its Not school days
 * (`TimeLimit.dayKind`). Such a schedule is saved with the weekdays it covers today, so an app that
 * has never heard of school days still enforces it as an ordinary weekday schedule. Where limits are
 * worked out, `applySchoolDays` rewrites the rules for the next seven days: a School days or Not
 * school days schedule takes the family's current school week, and a day off that falls in the
 * school week uses the Not school days amounts. Every reader that picks today's TimeLimit by
 * `daysOfWeek` then gets the right one without knowing about school days.
 *
 * Pure, and in the FAMILY's calendar: dates are `yyyy-MM-dd` keys compared as strings, the
 * `dateKey` of `familyClock`.
 */

import type { FamilyClock } from '../deviceguard/familyClock'
import type { LimitRule, TimeLimit } from '../types/usage-limits.types'

export const SCHOOL_DAYS_OFF_MAX = 60
/** Summer is the longest break most families add; a slipped year should not end school for good. */
export const SCHOOL_DAY_OFF_MAX_DAYS = 120
const NAME_MAX_LENGTH = 80
const DEFAULT_WEEK = [1, 2, 3, 4, 5]
/** How far ahead `applySchoolDays` rewrites: each weekday once, so a ruleset compiled today is right all week. */
const DAYS_AHEAD = 7

/** A break or a single day off: `from` and `to` are the first and last day, both included. */
export type SchoolDayOff = {
  id: string
  name: string
  from: string
  to: string
}

export type SchoolDaysSettings = {
  /** The weekdays the children do school, 0 = Sunday … 6 = Saturday. */
  week: number[]
  /** Sorted by first day. */
  daysOff: SchoolDayOff[]
  updatedAt: number
  updatedBy: string
}

export type SchoolDayKind = NonNullable<TimeLimit['dayKind']>

export function emptySchoolDays(): SchoolDaysSettings {
  return { week: [...DEFAULT_WEEK], daysOff: [], updatedAt: 0, updatedBy: '' }
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** A real calendar date as `yyyy-MM-dd`. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = DATE_KEY.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

function dateKeyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcToDateKey(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** `key` moved by `days` calendar days. */
export function addDays(key: string, days: number): string {
  return utcToDateKey(dateKeyToUtc(key) + days * 86_400_000)
}

/** 0 = Sunday … 6 = Saturday, for a `yyyy-MM-dd` key. */
export function weekdayOf(key: string): number {
  return new Date(dateKeyToUtc(key)).getUTCDay()
}

function daysBetween(from: string, to: string): number {
  return Math.round((dateKeyToUtc(to) - dateKeyToUtc(from)) / 86_400_000)
}

function normalizeWeek(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_WEEK]
  const days = [...new Set(raw.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  // No school days at all is not a school week; it would quietly turn every day into Not school days.
  return days.length ? days : [...DEFAULT_WEEK]
}

/**
 * Whatever is stored, in today's shape. Drops a day off with no name, a date that is not a real
 * date, a last day before the first, or one longer than 120 days, rather than refusing the record.
 */
export function normalizeSchoolDays(raw: unknown): SchoolDaysSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out = emptySchoolDays()
  out.week = normalizeWeek(input.week)
  const seen = new Set<string>()
  for (const item of Array.isArray(input.daysOff) ? input.daysOff : []) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, NAME_MAX_LENGTH) : ''
    const from = r.from
    const to = r.to ?? r.from
    if (!name || !isDateKey(from) || !isDateKey(to) || to < from) continue
    if (daysBetween(from, to) + 1 > SCHOOL_DAY_OFF_MAX_DAYS) continue
    let id = typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : `${from}-${to}`
    while (seen.has(id)) id = `${id}-2`
    seen.add(id)
    out.daysOff.push({ id, name, from, to })
    if (out.daysOff.length >= SCHOOL_DAYS_OFF_MAX) break
  }
  out.daysOff.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : 1))
  if (typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)) out.updatedAt = input.updatedAt
  if (typeof input.updatedBy === 'string') out.updatedBy = input.updatedBy
  return out
}

/** Drops the days off that ended more than `keepDays` before `todayKey`, so last year's breaks do not pile up. */
export function pruneSchoolDays(settings: SchoolDaysSettings, todayKey: string, keepDays = 30): SchoolDaysSettings {
  const cutoff = addDays(todayKey, -keepDays)
  return { ...settings, daysOff: settings.daysOff.filter((d) => d.to >= cutoff) }
}

/** The break or day off `key` falls in, if any. */
export function dayOffOn(settings: SchoolDaysSettings, key: string): SchoolDayOff | null {
  return settings.daysOff.find((d) => key >= d.from && key <= d.to) ?? null
}

/** Whether `key` is a school day: in the school week and in no break or day off. */
export function isSchoolDay(settings: SchoolDaysSettings, key: string): boolean {
  return settings.week.includes(weekdayOf(key)) && !dayOffOn(settings, key)
}

/** The break running on `key`, else the next one to start; null when none is ahead. */
export function currentOrNextDayOff(settings: SchoolDaysSettings, key: string): { dayOff: SchoolDayOff; now: boolean } | null {
  const now = dayOffOn(settings, key)
  if (now) return { dayOff: now, now: true }
  const next = settings.daysOff.find((d) => d.from > key)
  return next ? { dayOff: next, now: false } : null
}

/** Whether a rule has a School days or Not school days schedule. */
export function usesSchoolDays(rule: Pick<LimitRule, 'timeLimits'>): boolean {
  return (rule.timeLimits ?? []).some((tl) => tl?.dayKind === 'school' || tl?.dayKind === 'notSchool')
}

/**
 * The weekdays a School days or Not school days schedule covers in an ordinary week: the school
 * week, or the rest of it, less any day an ordinary weekday schedule of the same rule already has.
 * What the editor saves into `daysOfWeek`, so an app that ignores `dayKind` still enforces it.
 */
export function weekdaysFor(kind: SchoolDayKind, settings: SchoolDaysSettings, claimed: number[] = []): number[] {
  const all = [0, 1, 2, 3, 4, 5, 6]
  return all.filter((d) => (kind === 'school' ? settings.week.includes(d) : !settings.week.includes(d)) && !claimed.includes(d))
}

/**
 * One rule as it applies over the seven days from `clock`'s today. A rule with no School days or
 * Not school days schedule comes back as it is.
 *
 * Ordinary weekday schedules keep their days. A School days schedule covers the school week, a Not
 * school days schedule the rest, and a school-week day inside a break moves from the first to the
 * second. With no Not school days schedule, such a day has no limit from this rule, as a weekday no
 * schedule covers has none. Schedules left with no days are dropped: an empty `daysOfWeek` means
 * every day to some readers.
 */
export function applySchoolDaysToRule(rule: LimitRule, settings: SchoolDaysSettings, clock: Pick<FamilyClock, 'dateKey'>): LimitRule {
  const limits = rule.timeLimits ?? []
  if (!usesSchoolDays(rule)) return rule
  const plain = limits.filter((tl) => tl?.dayKind !== 'school' && tl?.dayKind !== 'notSchool')
  const claimed = [...new Set(plain.flatMap((tl) => tl.daysOfWeek ?? []))]
  const school = limits.find((tl) => tl.dayKind === 'school')
  const notSchool = limits.find((tl) => tl.dayKind === 'notSchool')

  const schoolDays = new Set(weekdaysFor('school', settings, claimed))
  const otherDays = new Set(weekdaysFor('notSchool', settings, claimed))
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const key = addDays(clock.dateKey, i)
    const dow = weekdayOf(key)
    if (schoolDays.has(dow) && dayOffOn(settings, key)) {
      schoolDays.delete(dow)
      otherDays.add(dow)
    }
  }

  const sorted = (days: Set<number>) => [...days].sort((a, b) => a - b)
  const out: TimeLimit[] = [...plain]
  if (school && schoolDays.size) out.push({ ...school, daysOfWeek: sorted(schoolDays) })
  if (notSchool && otherDays.size) out.push({ ...notSchool, daysOfWeek: sorted(otherDays) })
  return { ...rule, timeLimits: out.filter((tl) => (tl.daysOfWeek ?? []).length > 0) }
}

/** `applySchoolDaysToRule` over a list; the same array back when no rule uses school days. */
export function applySchoolDays(rules: LimitRule[], raw: SchoolDaysSettings | unknown, clock: Pick<FamilyClock, 'dateKey'>): LimitRule[] {
  if (!rules.some(usesSchoolDays)) return rules
  const settings = normalizeSchoolDays(raw)
  return rules.map((rule) => applySchoolDaysToRule(rule, settings, clock))
}
