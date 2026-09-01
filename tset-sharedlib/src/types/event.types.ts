/**
 * Calendar events.
 *
 * An event is an item, exactly as a task is: `type: 'thing'`, `subType: 'event'`,
 * with the typed payload in the encrypted `details.info.schemas['kindredly.event.v1']`
 * blob and `eventId === itemId`. See `event.utils.ts` for the serialisation, and
 * `docs/specs/events-as-items-and-calendar-sources.md` for why.
 *
 * The recurrence rule here is deliberately richer than `TaskRecurrence`: a task
 * repeats daily or weekly and that covers routines, but a calendar has to hold
 * "the second Tuesday of every month" and "every 3 weeks" — and the same rule
 * shape has to be able to receive an iCalendar RRULE when external calendars land.
 */

/** 0 = Sunday … 6 = Saturday. */
export type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * One weekday selector inside a rule.
 *
 * `ordinal` is only meaningful for monthly and yearly rules: 2 = the 2nd such
 * weekday of the period, -1 = the last. Weekly rules ignore it.
 */
export type CalendarRuleWeekday = {
  day: CalendarWeekday
  ordinal?: number
}

/**
 * A repeat rule, shaped to receive an iCalendar RRULE without a lossy conversion.
 *
 * Anything not expressible here (BYSETPOS, BYWEEKNO, BYYEARDAY, sub-daily
 * frequencies) is out of scope by choice — see `listRecurrenceOccurrences`.
 */
export type CalendarRecurrenceRule = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** Every N periods. Defaults to 1. */
  interval?: number
  /** Stop after this many occurrences, counted before exceptions are removed. */
  count?: number
  /** Stop after this instant, inclusive. */
  untilMs?: number
  /** Weekly: which days. Monthly/yearly: which weekday, optionally ordinal. */
  byDay?: CalendarRuleWeekday[]
  /** Monthly/yearly: days of the month. Negative counts back from the end. */
  byMonthDay?: number[]
  /** Yearly: which months, 1-12. */
  byMonth?: number[]
  /** Which day a week starts on, for interval maths. Defaults to Sunday. */
  weekStart?: CalendarWeekday
}

export type EventStatus = 'active' | 'archived'

export type EventDefinition = {
  /** Identical to the item id in v1. */
  eventId: string
  accountId: string
  createdByUserId: string

  title: string
  details?: string
  location?: string
  url?: string

  /** First occurrence. For an all-day event this is local midnight. */
  startMs: number
  /**
   * End of the first occurrence, exclusive.
   *
   * A timed event defaults to one hour. An all-day event ends at the local
   * midnight *after* its last day, so a single-day event spans exactly 24h —
   * the same exclusive-end convention the month grid uses.
   */
  endMs: number
  allDay: boolean

  /**
   * IANA zone the event was authored in, e.g. "America/Los_Angeles".
   *
   * Recorded for forward compatibility. v1 expands recurrences in the viewer's
   * local zone, which is correct for a family in one timezone and is what tasks
   * already do; true cross-zone expansion arrives with external calendars.
   */
  timeZoneId?: string

  recurrence?: CalendarRecurrenceRule
  /** Occurrence start times removed from the series ("skip just this one"). */
  exceptions?: number[]

  /** Whose calendars this belongs on. Mirrors a task's `assignedUserIds`. */
  attendeeUserIds: string[]
  /** Visible to everyone in the family, not only to attendees. */
  sharedWithFamily?: boolean

  status: EventStatus
  linkedItemIds?: string[]
  sourceItemId?: string

  createdAt: number
  updatedAt: number
}

export type EventOccurrenceView = {
  /** `${eventId}:${occurrenceStartMs}` — stable across refetch. */
  occurrenceId: string
  eventId: string
  event: EventDefinition
  occurrenceStartMs: number
  /** Exclusive. */
  occurrenceEndMs: number
  allDay: boolean
}

/**
 * The normalised shape every event-like source produces.
 *
 * Local event items convert to this, and so will an ICS VEVENT or a Google
 * Calendar entry, so one expander and one renderer serve all three.
 */
export type CalendarEventRecord = {
  /** Unique within its source calendar. */
  uid: string
  title: string
  description?: string
  location?: string
  startMs: number
  endMs: number
  allDay: boolean
  timeZoneId?: string
  recurrence?: CalendarRecurrenceRule
  exceptions?: number[]
  /** Per-occurrence edits, keyed by the occurrence's original start. */
  overrides?: Record<number, Partial<CalendarEventRecord>>
  url?: string
}
