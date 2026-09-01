import { listRecurrenceOccurrences } from './calendar/recurrence'
import type {
  CalendarRecurrenceRule,
  EventDefinition,
  EventOccurrenceView,
  EventStatus,
} from './types/event.types'

/**
 * Event items: the encrypted schema payload, and the occurrence maths.
 *
 * An event is an item with `type: 'thing'` and `subType: 'event'`, its typed
 * fields living in `details.info.schemas['kindredly.event.v1']`. That is exactly
 * how tasks are stored (`kindredly.task.v1`), for the same reason: the server
 * stays schema-agnostic and never sees a title, a location, or a time.
 *
 * Dependency-free (types only), like `task.utils.ts`.
 */

export const EVENT_ITEM_SCHEMA_ID = 'kindredly.event.v1'
export const EVENT_ITEM_SUBTYPE = 'event'

const HOUR_MS = 60 * 60 * 1000

export interface EventSchemaV1 {
  schemaVersion: 1
  accountId: string
  createdByUserId: string
  title: string
  details?: string
  location?: string
  url?: string
  startMs: number
  endMs: number
  allDay: boolean
  timeZoneId?: string
  recurrence?: CalendarRecurrenceRule
  exceptions?: number[]
  attendeeUserIds: string[]
  sharedWithFamily?: boolean
  status: EventStatus
  linkedItemIds?: string[]
  sourceItemId?: string
  createdAt: number
  updatedAt: number
}

/** The minimum an item has to look like for the readers below. */
type EventItemLike = {
  itemId?: string
  details?: {
    subType?: string | null
    name?: string | null
    description?: string | null
    info?: { schemas?: Record<string, unknown> | null } | null
  } | null
}

export function toStartOfLocalDayMs(ms: number): number {
  const day = new Date(ms)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/** Local midnight `count` calendar days after `ms`. DST-safe: never `+ 86_400_000`. */
export function addLocalDaysMs(ms: number, count: number): number {
  const day = new Date(ms)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + count)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

export function isEventItemLike(item: EventItemLike | null | undefined): boolean {
  return item?.details?.subType === EVENT_ITEM_SUBTYPE
}

/**
 * Snap a start/end pair to the convention the grid relies on.
 *
 * All-day events run from local midnight to the local midnight *after* their
 * last day, so a one-day event is exactly one day wide and an end that landed
 * before its start can never render as a negative block.
 */
export function normalizeEventTimes(input: {
  startMs: number
  endMs?: number
  allDay: boolean
}): { startMs: number; endMs: number } {
  const allDay = input.allDay === true

  if (allDay) {
    const startMs = toStartOfLocalDayMs(input.startMs)
    const rawEnd = Number.isFinite(input.endMs as number) ? (input.endMs as number) : startMs
    // An end already on a midnight is taken as exclusive; anything inside a day
    // means that day is included, so round it up to the next midnight.
    const endDayStart = toStartOfLocalDayMs(rawEnd)
    const endMs = endDayStart === rawEnd && rawEnd > startMs ? rawEnd : addLocalDaysMs(endDayStart, 1)
    return { startMs, endMs: Math.max(endMs, addLocalDaysMs(startMs, 1)) }
  }

  const startMs = input.startMs
  const rawEnd = Number.isFinite(input.endMs as number) ? (input.endMs as number) : startMs + HOUR_MS
  return { startMs, endMs: rawEnd > startMs ? rawEnd : startMs + HOUR_MS }
}

export function toEventSchemaV1(event: EventDefinition): EventSchemaV1 {
  const times = normalizeEventTimes({ startMs: event.startMs, endMs: event.endMs, allDay: event.allDay })

  return {
    schemaVersion: 1,
    accountId: event.accountId,
    createdByUserId: event.createdByUserId,
    title: event.title,
    details: event.details,
    location: event.location,
    url: event.url,
    startMs: times.startMs,
    endMs: times.endMs,
    allDay: event.allDay === true,
    timeZoneId: event.timeZoneId,
    recurrence: event.recurrence,
    exceptions: event.exceptions,
    attendeeUserIds: Array.isArray(event.attendeeUserIds) ? event.attendeeUserIds : [],
    sharedWithFamily: event.sharedWithFamily === true,
    status: event.status === 'archived' ? 'archived' : 'active',
    linkedItemIds: event.linkedItemIds,
    sourceItemId: event.sourceItemId,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}

/** Read an event item back into a definition, or null when it is not one. */
export function toEventDefinition(item: EventItemLike | null | undefined): EventDefinition | null {
  if (!isEventItemLike(item)) return null

  const schema = item?.details?.info?.schemas?.[EVENT_ITEM_SCHEMA_ID] as EventSchemaV1 | undefined
  if (!schema || schema.schemaVersion !== 1) return null
  if (!Number.isFinite(schema.startMs)) return null

  const eventId = item?.itemId || ''
  if (!eventId) return null

  const times = normalizeEventTimes({
    startMs: schema.startMs,
    endMs: schema.endMs,
    allDay: schema.allDay === true,
  })

  return {
    eventId,
    accountId: schema.accountId || '',
    createdByUserId: schema.createdByUserId || '',
    title: schema.title || item?.details?.name || '',
    details: schema.details ?? item?.details?.description ?? undefined,
    location: schema.location,
    url: schema.url,
    startMs: times.startMs,
    endMs: times.endMs,
    allDay: schema.allDay === true,
    timeZoneId: schema.timeZoneId,
    recurrence: schema.recurrence,
    exceptions: Array.isArray(schema.exceptions) ? schema.exceptions : undefined,
    attendeeUserIds: Array.isArray(schema.attendeeUserIds) ? schema.attendeeUserIds : [],
    sharedWithFamily: schema.sharedWithFamily === true,
    status: schema.status === 'archived' ? 'archived' : 'active',
    linkedItemIds: Array.isArray(schema.linkedItemIds) ? schema.linkedItemIds : undefined,
    sourceItemId: schema.sourceItemId,
    createdAt: typeof schema.createdAt === 'number' ? schema.createdAt : 0,
    updatedAt: typeof schema.updatedAt === 'number' ? schema.updatedAt : 0,
  }
}

export function buildEventOccurrenceId(eventId: string, occurrenceStartMs: number): string {
  return `${eventId}:${occurrenceStartMs}`
}

/** Every occurrence of one event overlapping `[startMs, endMs)`, in time order. */
export function listEventOccurrencesForRange(input: {
  event: EventDefinition
  startMs: number
  endMs: number
}): EventOccurrenceView[] {
  const { event } = input

  return listRecurrenceOccurrences({
    startMs: event.startMs,
    endMs: event.endMs,
    rule: event.recurrence,
    exceptions: event.exceptions,
    rangeStartMs: input.startMs,
    rangeEndMs: input.endMs,
  }).map((occurrence) => ({
    occurrenceId: buildEventOccurrenceId(event.eventId, occurrence.occurrenceStartMs),
    eventId: event.eventId,
    event,
    occurrenceStartMs: occurrence.occurrenceStartMs,
    occurrenceEndMs: occurrence.occurrenceEndMs,
    allDay: event.allDay === true,
  }))
}

/**
 * The local days one occurrence should appear on.
 *
 * The grid buckets entries by a single local-midnight key, so a multi-day event
 * becomes one entry per day it covers rather than a single entry that silently
 * only shows on its first. The exclusive end is what stops a 9am–5pm Friday
 * event from also claiming Saturday.
 */
export function listOccurrenceDayMs(input: {
  occurrenceStartMs: number
  occurrenceEndMs: number
}): number[] {
  const firstDayMs = toStartOfLocalDayMs(input.occurrenceStartMs)
  const lastMoment = Math.max(input.occurrenceEndMs - 1, input.occurrenceStartMs)
  const lastDayMs = toStartOfLocalDayMs(lastMoment)

  const days: number[] = []
  let dayMs = firstDayMs
  // Bounded so a corrupt end far in the future cannot spin here.
  for (let guard = 0; guard < 400 && dayMs <= lastDayMs; guard += 1) {
    days.push(dayMs)
    dayMs = addLocalDaysMs(dayMs, 1)
  }
  return days
}

export function compareEventOccurrences(a: EventOccurrenceView, b: EventOccurrenceView): number {
  if (a.occurrenceStartMs !== b.occurrenceStartMs) return a.occurrenceStartMs - b.occurrenceStartMs
  return (a.event?.title || '').localeCompare(b.event?.title || '')
}
