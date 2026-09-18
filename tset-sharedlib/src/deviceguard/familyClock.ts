/**
 * The family's clock (D3, DCP-16): which day it is, which weekday, and what time, in the family
 * timezone.
 *
 * Guard compiles schedules in the family timezone (`compileDeviceSettings`). The browser's
 * web-limits engine used the clock of whatever device it ran on, so a child's browser three zones
 * away reset the daily budget, chose the weekday's limit and opened schedule windows on its own
 * clock while Guard on the same child's phone used the family's. The founder decided the family
 * timezone governs web limits too (proposal §7 Q5).
 *
 * `timeZone` null, empty or not a zone `Intl` knows: the device's own clock, which is what every
 * limit used before. A family whose guardian has never opened an updated client has no zone yet.
 */

import { timeZoneOffsetMinutes } from './compileDeviceSettings'

const DAY_MS = 24 * 60 * 60 * 1000

export type FamilyClock = {
  /** The zone used, or null when this is the device's own clock. */
  timeZone: string | null
  /** When today began, in epoch ms. */
  dayStartMs: number
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number
  /** Wall-clock milliseconds since midnight: what a schedule window's `HH:MM` is compared with. */
  msOfDay: number
  /** `yyyy-MM-dd`: the day usage is bucketed under and the usage seed is keyed by. */
  dateKey: string
  /** Minutes to add to UTC for the clock's local time at `nowMs`. */
  offsetMinutes: number
}

/** Whether `Intl` accepts `timeZone` as a zone id. */
export function isKnownTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function familyClock(nowMs: number, timeZone: string | null | undefined): FamilyClock {
  if (!isKnownTimeZone(timeZone)) {
    const now = new Date(nowMs)
    const dayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return {
      timeZone: null,
      dayStartMs,
      dayOfWeek: now.getDay(),
      msOfDay: (now.getHours() * 60 + now.getMinutes()) * 60_000 + now.getSeconds() * 1000 + now.getMilliseconds(),
      dateKey: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      offsetMinutes: -now.getTimezoneOffset(),
    }
  }

  const offsetMinutes = timeZoneOffsetMinutes(nowMs, timeZone)
  const wall = new Date(nowMs + offsetMinutes * 60_000)
  const midnightAsUtc = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate())
  // Midnight's own offset, not now's: on the day clocks change they differ by an hour.
  const firstGuess = midnightAsUtc - offsetMinutes * 60_000
  const dayStartMs = midnightAsUtc - timeZoneOffsetMinutes(firstGuess, timeZone) * 60_000
  return {
    timeZone,
    dayStartMs,
    dayOfWeek: wall.getUTCDay(),
    msOfDay: ((nowMs + offsetMinutes * 60_000) % DAY_MS + DAY_MS) % DAY_MS,
    dateKey: wall.toISOString().slice(0, 10),
    offsetMinutes,
  }
}

/**
 * The last millisecond of the clock's today, when "until midnight" bonus time and rewards expire.
 * Tomorrow's start, not today's plus 24 hours: the day clocks change is 23 or 25 hours long.
 */
export function familyDayEndMs(clock: FamilyClock): number {
  return familyClock(clock.dayStartMs + 30 * 60 * 60 * 1000, clock.timeZone).dayStartMs - 1
}
