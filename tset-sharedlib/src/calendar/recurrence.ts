import type { CalendarRecurrenceRule, CalendarWeekday } from '../types/event.types'

/**
 * Recurrence expansion for calendar events.
 *
 * Deliberately dependency-free (types only), like `task.utils.ts`: the background
 * service, the UI, and the external-calendar importer all share this one
 * implementation, so an event cannot land on one day in the month grid and a
 * different day in the week view.
 *
 * Every step through the calendar is done with local date fields (`setDate`,
 * `new Date(y, m, d, …)`) and never by adding 86_400_000 to the previous
 * instant. A recurring 9am event must stay at 9am across a DST change, and
 * millisecond arithmetic across one either shifts it an hour or skips a day.
 *
 * In scope: FREQ daily/weekly/monthly/yearly, INTERVAL, COUNT, UNTIL, BYDAY
 * (with monthly/yearly ordinals such as "2nd Tuesday" and "last Friday"),
 * BYMONTHDAY (including negatives counted from the month's end), BYMONTH, WKST.
 * Out of scope by choice: BYSETPOS, BYWEEKNO, BYYEARDAY, BYHOUR/BYMINUTE and
 * sub-daily frequencies. A rule carrying only unsupported parts still yields its
 * first instance, so an imported event never silently disappears.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Hard ceiling on instances produced by one call, so a bad rule cannot hang a render. */
export const MAX_RECURRENCE_OCCURRENCES = 1000

/** Ceiling on periods walked, so a rule that never matches (Feb 30th) still terminates. */
const MAX_PERIOD_STEPS = 5000

export type RecurrenceOccurrence = {
  occurrenceStartMs: number
  /** Exclusive. */
  occurrenceEndMs: number
}

/**
 * A DST-immune ordinal for a local calendar day.
 *
 * Differences between two of these are exact whole days, which subtracting
 * timestamps is not: a spring-forward day is 23 hours long.
 */
function localDayIndex(ms: number): number {
  const date = new Date(ms)
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * The day-of-month for the `ordinal`th `weekday` of a month, or null when the
 * month has no such day (a 5th Monday, say).
 */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: CalendarWeekday,
  ordinal: number,
): number | null {
  const daysInMonth = getDaysInMonth(year, month)

  if (ordinal > 0) {
    const firstWeekday = new Date(year, month, 1).getDay()
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7
    return day <= daysInMonth ? day : null
  }

  if (ordinal < 0) {
    const lastWeekday = new Date(year, month, daysInMonth).getDay()
    const day = daysInMonth - ((lastWeekday - weekday + 7) % 7) + (ordinal + 1) * 7
    return day >= 1 ? day : null
  }

  return null
}

/** Every day-of-month falling on `weekday`. */
function allWeekdaysOfMonth(year: number, month: number, weekday: CalendarWeekday): number[] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstWeekday = new Date(year, month, 1).getDay()
  const days: number[] = []
  for (let day = 1 + ((weekday - firstWeekday + 7) % 7); day <= daysInMonth; day += 7) {
    days.push(day)
  }
  return days
}

/** Resolve a BYMONTHDAY value against a month, honouring negatives. -1 = the last day. */
function resolveMonthDay(year: number, month: number, monthDay: number): number | null {
  const daysInMonth = getDaysInMonth(year, month)
  const day = monthDay > 0 ? monthDay : daysInMonth + 1 + monthDay
  if (day < 1 || day > daysInMonth) return null
  return day
}

/**
 * Which days of one month a monthly or yearly rule selects.
 *
 * Precedence matches RFC 5545's common subset: BYMONTHDAY wins, then BYDAY
 * (ordinal or every-such-weekday), and with neither the rule repeats the seed's
 * own day of the month — which is why a rule anchored on the 31st simply has no
 * instance in a 30-day month rather than sliding into the next one.
 */
function selectDaysInMonth(
  year: number,
  month: number,
  rule: CalendarRecurrenceRule,
  seedDayOfMonth: number,
): number[] {
  const days = new Set<number>()

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    for (const monthDay of rule.byMonthDay) {
      const day = resolveMonthDay(year, month, monthDay)
      if (day !== null) days.add(day)
    }
    return Array.from(days).sort((a, b) => a - b)
  }

  if (rule.byDay && rule.byDay.length > 0) {
    for (const selector of rule.byDay) {
      if (selector.ordinal === undefined || selector.ordinal === 0) {
        for (const day of allWeekdaysOfMonth(year, month, selector.day)) days.add(day)
        continue
      }
      const day = nthWeekdayOfMonth(year, month, selector.day, selector.ordinal)
      if (day !== null) days.add(day)
    }
    return Array.from(days).sort((a, b) => a - b)
  }

  const daysInMonth = getDaysInMonth(year, month)
  if (seedDayOfMonth <= daysInMonth) days.add(seedDayOfMonth)
  return Array.from(days)
}

/**
 * Expand a rule into the occurrences overlapping `[rangeStartMs, rangeEndMs)`.
 *
 * `startMs`/`endMs` describe the series' first instance; every later instance
 * keeps that duration and that wall-clock time of day. With no rule this is
 * simply that one instance, filtered by the window — so callers never need to
 * branch on whether an event repeats.
 */
export function listRecurrenceOccurrences(input: {
  startMs: number
  endMs: number
  rule?: CalendarRecurrenceRule | null
  exceptions?: number[] | null
  rangeStartMs: number
  rangeEndMs: number
}): RecurrenceOccurrence[] {
  const { startMs, endMs, rule, rangeStartMs, rangeEndMs } = input

  if (!Number.isFinite(startMs) || !Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs)) {
    return []
  }
  if (rangeEndMs <= rangeStartMs) return []

  const durationMs = Math.max(0, (Number.isFinite(endMs) ? endMs : startMs) - startMs)
  const excluded = new Set((input.exceptions || []).filter((ms) => Number.isFinite(ms)))

  // A zero-length event still occupies the instant it starts on, so it must not
  // fall through an overlap test written for spans.
  const overlapMs = Math.max(durationMs, 1)
  const overlapsWindow = (occurrenceStartMs: number) =>
    occurrenceStartMs < rangeEndMs && occurrenceStartMs + overlapMs > rangeStartMs

  const toOccurrence = (occurrenceStartMs: number): RecurrenceOccurrence => ({
    occurrenceStartMs,
    occurrenceEndMs: occurrenceStartMs + durationMs,
  })

  if (!rule || !rule.freq) {
    if (excluded.has(startMs) || !overlapsWindow(startMs)) return []
    return [toOccurrence(startMs)]
  }

  const interval = Math.max(1, Math.floor(rule.interval || 1))
  const count = typeof rule.count === 'number' && rule.count > 0 ? Math.floor(rule.count) : null
  const untilMs = typeof rule.untilMs === 'number' && Number.isFinite(rule.untilMs) ? rule.untilMs : null
  const weekStart = ((rule.weekStart ?? 0) % 7) as CalendarWeekday

  const seed = new Date(startMs)
  const seedHours = seed.getHours()
  const seedMinutes = seed.getMinutes()
  const seedSeconds = seed.getSeconds()
  const seedMilliseconds = seed.getMilliseconds()
  const seedDayOfMonth = seed.getDate()

  const at = (year: number, month: number, day: number): number =>
    new Date(year, month, day, seedHours, seedMinutes, seedSeconds, seedMilliseconds).getTime()

  // COUNT is defined over the whole series, so a windowed read still has to
  // count from the beginning — but COUNT itself bounds that walk. Without one,
  // jump the cursor to the window instead of walking years of history.
  const canFastForward = count === null && rangeStartMs > startMs

  const collected: number[] = []
  // DTSTART is offered before the rule's own walk, which then reaches the same
  // instant again. Counting it twice would make COUNT=3 yield two occurrences,
  // so identity is settled here rather than by de-duplicating the output.
  const seen = new Set<number>()
  let generated = 0
  let steps = 0
  let done = false

  /** Returns false once the series is finished, so the period loop can stop. */
  const offer = (occurrenceStartMs: number): boolean => {
    if (occurrenceStartMs < startMs) return true
    if (untilMs !== null && occurrenceStartMs > untilMs) return false
    if (seen.has(occurrenceStartMs)) return true

    seen.add(occurrenceStartMs)
    generated += 1
    if (generated > MAX_RECURRENCE_OCCURRENCES) return false

    if (!excluded.has(occurrenceStartMs) && overlapsWindow(occurrenceStartMs)) {
      collected.push(occurrenceStartMs)
    }

    if (count !== null && generated >= count) return false
    return true
  }

  // DTSTART is always the series' first instance, even when the rule's own
  // selectors would not have produced it — the way Google and Apple both behave.
  if (!offer(startMs)) done = true

  if (rule.freq === 'daily') {
    let cursorIndex = 0
    if (canFastForward) {
      const daysAhead = localDayIndex(rangeStartMs) - localDayIndex(startMs)
      if (daysAhead > 0) cursorIndex = Math.floor(daysAhead / interval) * interval
    }

    const cursor = new Date(startMs)
    cursor.setDate(cursor.getDate() + cursorIndex)

    while (!done && steps < MAX_PERIOD_STEPS) {
      steps += 1
      const occurrenceStartMs = at(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      if (occurrenceStartMs >= rangeEndMs) break
      if (!offer(occurrenceStartMs)) break
      cursor.setDate(cursor.getDate() + interval)
    }
  } else if (rule.freq === 'weekly') {
    const weekdays = Array.from(
      new Set(
        rule.byDay && rule.byDay.length > 0
          ? rule.byDay.map((selector) => ((selector.day % 7) + 7) % 7)
          : [seed.getDay()],
      ),
    ).sort((a, b) => a - b) as CalendarWeekday[]

    // Anchor on the first day of the seed's week so INTERVAL counts whole weeks
    // from a fixed point rather than from whichever weekday the event began on.
    const anchor = new Date(startMs)
    anchor.setDate(anchor.getDate() - (((anchor.getDay() - weekStart) % 7) + 7) % 7)

    if (canFastForward) {
      const weeksAhead = Math.floor((localDayIndex(rangeStartMs) - localDayIndex(anchor.getTime())) / 7)
      if (weeksAhead > 0) anchor.setDate(anchor.getDate() + Math.floor(weeksAhead / interval) * interval * 7)
    }

    while (!done && steps < MAX_PERIOD_STEPS) {
      steps += 1
      let anyBeforeWindowEnd = false

      for (const weekday of weekdays) {
        const day = new Date(anchor.getTime())
        day.setDate(day.getDate() + ((((weekday - weekStart) % 7) + 7) % 7))
        const occurrenceStartMs = at(day.getFullYear(), day.getMonth(), day.getDate())
        if (occurrenceStartMs >= rangeEndMs) continue
        anyBeforeWindowEnd = true
        if (!offer(occurrenceStartMs)) {
          done = true
          break
        }
      }

      if (done) break
      // Every day of this week already sits past the window; later weeks only
      // move further away.
      if (!anyBeforeWindowEnd && at(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()) >= rangeEndMs) break
      anchor.setDate(anchor.getDate() + interval * 7)
    }
  } else {
    // Monthly and yearly differ only in how far each period steps and whether
    // the months are chosen by BYMONTH.
    const isYearly = rule.freq === 'yearly'
    const seedMonth = seed.getMonth()
    const months = isYearly
      ? Array.from(
          new Set(
            rule.byMonth && rule.byMonth.length > 0
              ? rule.byMonth.filter((month) => month >= 1 && month <= 12).map((month) => month - 1)
              : [seedMonth],
          ),
        ).sort((a, b) => a - b)
      : null

    let cursorYear = seed.getFullYear()
    let cursorMonth = isYearly ? 0 : seedMonth

    if (canFastForward) {
      const rangeStart = new Date(rangeStartMs)
      if (isYearly) {
        const yearsAhead = rangeStart.getFullYear() - cursorYear
        if (yearsAhead > 0) cursorYear += Math.floor(yearsAhead / interval) * interval
      } else {
        const monthsAhead =
          (rangeStart.getFullYear() - cursorYear) * 12 + (rangeStart.getMonth() - cursorMonth)
        if (monthsAhead > 0) {
          const skipped = Math.floor(monthsAhead / interval) * interval
          cursorYear += Math.floor((cursorMonth + skipped) / 12)
          cursorMonth = (cursorMonth + skipped) % 12
        }
      }
    }

    while (!done && steps < MAX_PERIOD_STEPS) {
      steps += 1

      const monthsThisPeriod = isYearly ? (months as number[]) : [cursorMonth]
      let anyBeforeWindowEnd = false

      for (const month of monthsThisPeriod) {
        const days = selectDaysInMonth(cursorYear, month, rule, seedDayOfMonth)
        for (const day of days) {
          const occurrenceStartMs = at(cursorYear, month, day)
          if (occurrenceStartMs >= rangeEndMs) continue
          anyBeforeWindowEnd = true
          if (!offer(occurrenceStartMs)) {
            done = true
            break
          }
        }
        if (done) break
      }

      if (done) break
      if (!anyBeforeWindowEnd && at(cursorYear, monthsThisPeriod[0] ?? 0, 1) >= rangeEndMs) break

      if (isYearly) {
        cursorYear += interval
      } else {
        cursorYear += Math.floor((cursorMonth + interval) / 12)
        cursorMonth = (cursorMonth + interval) % 12
      }
    }
  }

  return collected.sort((a, b) => a - b).map(toOccurrence)
}
