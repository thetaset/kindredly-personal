import {
  EVENT_ITEM_SCHEMA_ID,
  addLocalDaysMs,
  buildEventOccurrenceId,
  listEventOccurrencesForRange,
  listOccurrenceDayMs,
  normalizeEventTimes,
  toEventDefinition,
  toEventSchemaV1,
  toStartOfLocalDayMs,
} from '../src/event.utils';
import type { EventDefinition } from '../src/types/event.types';

const HOUR_MS = 60 * 60 * 1000;

function at(year: number, month1to12: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month1to12 - 1, day, hour, minute, 0, 0).getTime();
}

function makeEvent(overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    eventId: 'evt1',
    accountId: 'acct1',
    createdByUserId: 'user1',
    title: 'Soccer practice',
    startMs: at(2026, 3, 10, 16),
    endMs: at(2026, 3, 10, 17, 30),
    allDay: false,
    attendeeUserIds: ['user2'],
    status: 'active',
    createdAt: at(2026, 3, 1),
    updatedAt: at(2026, 3, 1),
    ...overrides,
  };
}

function asItem(event: EventDefinition, itemId = event.eventId) {
  return {
    itemId,
    details: {
      subType: 'event',
      name: event.title,
      description: event.details,
      info: { schemas: { [EVENT_ITEM_SCHEMA_ID]: toEventSchemaV1(event) } },
    },
  };
}

describe('normalizeEventTimes', () => {
  test('a timed event with no end gets an hour', () => {
    const times = normalizeEventTimes({ startMs: at(2026, 3, 10, 9), allDay: false });
    expect(times.endMs - times.startMs).toBe(HOUR_MS);
  });

  test('an end at or before the start is repaired rather than rendered backwards', () => {
    const times = normalizeEventTimes({
      startMs: at(2026, 3, 10, 9),
      endMs: at(2026, 3, 10, 8),
      allDay: false,
    });
    expect(times.endMs).toBe(at(2026, 3, 10, 10));
  });

  test('a single all-day event spans exactly one day, exclusive end', () => {
    const times = normalizeEventTimes({ startMs: at(2026, 3, 10, 14), allDay: true });
    expect(times.startMs).toBe(at(2026, 3, 10));
    expect(times.endMs).toBe(at(2026, 3, 11));
  });

  test('an all-day end inside a day includes that day', () => {
    const times = normalizeEventTimes({
      startMs: at(2026, 3, 10),
      endMs: at(2026, 3, 12, 15),
      allDay: true,
    });
    expect(times.endMs).toBe(at(2026, 3, 13));
  });

  test('an all-day end already on a midnight is taken as exclusive', () => {
    const times = normalizeEventTimes({
      startMs: at(2026, 3, 10),
      endMs: at(2026, 3, 12),
      allDay: true,
    });
    expect(times.endMs).toBe(at(2026, 3, 12));
  });
});

describe('schema round-trip', () => {
  test('an event survives being written to an item and read back', () => {
    const event = makeEvent({
      details: 'Bring cleats',
      location: 'North field',
      recurrence: { freq: 'weekly', byDay: [{ day: 2 }] },
      sharedWithFamily: true,
    });

    const parsed = toEventDefinition(asItem(event));
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe('Soccer practice');
    expect(parsed!.location).toBe('North field');
    expect(parsed!.recurrence).toEqual({ freq: 'weekly', byDay: [{ day: 2 }] });
    expect(parsed!.attendeeUserIds).toEqual(['user2']);
    expect(parsed!.sharedWithFamily).toBe(true);
    expect(parsed!.startMs).toBe(event.startMs);
    expect(parsed!.endMs).toBe(event.endMs);
  });

  test('the event id comes from the item, not the payload', () => {
    const parsed = toEventDefinition(asItem(makeEvent(), 'item-abc'));
    expect(parsed!.eventId).toBe('item-abc');
  });

  test('a task item is not read as an event', () => {
    const item = asItem(makeEvent());
    item.details.subType = 'task';
    expect(toEventDefinition(item)).toBeNull();
  });

  test('a missing or wrong-version schema yields null', () => {
    expect(toEventDefinition({ itemId: 'x', details: { subType: 'event', info: { schemas: {} } } })).toBeNull();
    expect(
      toEventDefinition({
        itemId: 'x',
        details: { subType: 'event', info: { schemas: { [EVENT_ITEM_SCHEMA_ID]: { schemaVersion: 2 } } } },
      }),
    ).toBeNull();
  });

  test('an item with no id yields null rather than an unaddressable event', () => {
    expect(toEventDefinition(asItem(makeEvent(), ''))).toBeNull();
  });
});

describe('listEventOccurrencesForRange', () => {
  test('a one-off event inside the window', () => {
    const occurrences = listEventOccurrencesForRange({
      event: makeEvent(),
      startMs: at(2026, 3, 1),
      endMs: at(2026, 4, 1),
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceId).toBe(buildEventOccurrenceId('evt1', at(2026, 3, 10, 16)));
    expect(occurrences[0].allDay).toBe(false);
  });

  test('a weekly event repeats across the window and keeps its duration', () => {
    const occurrences = listEventOccurrencesForRange({
      event: makeEvent({ recurrence: { freq: 'weekly' } }),
      startMs: at(2026, 3, 1),
      endMs: at(2026, 3, 29),
    });
    expect(occurrences).toHaveLength(3);
    for (const occurrence of occurrences) {
      expect(occurrence.occurrenceEndMs - occurrence.occurrenceStartMs).toBe(90 * 60 * 1000);
    }
  });

  test('a skipped occurrence disappears from the series', () => {
    const occurrences = listEventOccurrencesForRange({
      event: makeEvent({
        recurrence: { freq: 'weekly' },
        exceptions: [at(2026, 3, 17, 16)],
      }),
      startMs: at(2026, 3, 1),
      endMs: at(2026, 3, 29),
    });
    expect(occurrences.map((occurrence) => occurrence.occurrenceStartMs)).toEqual([
      at(2026, 3, 10, 16),
      at(2026, 3, 24, 16),
    ]);
  });
});

describe('listOccurrenceDayMs', () => {
  test('a same-day event claims one day', () => {
    expect(
      listOccurrenceDayMs({
        occurrenceStartMs: at(2026, 3, 10, 9),
        occurrenceEndMs: at(2026, 3, 10, 17),
      }),
    ).toEqual([at(2026, 3, 10)]);
  });

  test('an event ending exactly at midnight does not claim the next day', () => {
    expect(
      listOccurrenceDayMs({
        occurrenceStartMs: at(2026, 3, 10, 9),
        occurrenceEndMs: at(2026, 3, 11),
      }),
    ).toEqual([at(2026, 3, 10)]);
  });

  test('a multi-day event claims every day it covers', () => {
    expect(
      listOccurrenceDayMs({
        occurrenceStartMs: at(2026, 3, 10),
        occurrenceEndMs: at(2026, 3, 13),
      }),
    ).toEqual([at(2026, 3, 10), at(2026, 3, 11), at(2026, 3, 12)]);
  });

  test('spans a DST change without dropping or repeating a day', () => {
    // US DST begins 2026-03-08.
    expect(
      listOccurrenceDayMs({
        occurrenceStartMs: at(2026, 3, 6),
        occurrenceEndMs: at(2026, 3, 10),
      }),
    ).toEqual([at(2026, 3, 6), at(2026, 3, 7), at(2026, 3, 8), at(2026, 3, 9)]);
  });
});

describe('local day helpers', () => {
  test('addLocalDaysMs keeps midnight across a DST change', () => {
    const dayBefore = at(2026, 3, 7);
    expect(addLocalDaysMs(dayBefore, 1)).toBe(at(2026, 3, 8));
    expect(new Date(addLocalDaysMs(dayBefore, 1)).getHours()).toBe(0);
  });

  test('toStartOfLocalDayMs floors to local midnight', () => {
    expect(toStartOfLocalDayMs(at(2026, 3, 10, 23, 59))).toBe(at(2026, 3, 10));
  });
});
