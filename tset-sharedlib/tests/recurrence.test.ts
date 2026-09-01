import {
  listRecurrenceOccurrences,
  MAX_RECURRENCE_OCCURRENCES,
} from '../src/calendar/recurrence';
import type { CalendarRecurrenceRule } from '../src/types/event.types';

const HOUR_MS = 60 * 60 * 1000;

/** Local wall-clock helper, so tests read as dates rather than epochs. */
function at(year: number, month1to12: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month1to12 - 1, day, hour, minute, 0, 0).getTime();
}

function starts(occurrences: Array<{ occurrenceStartMs: number }>): string[] {
  return occurrences.map((occurrence) =>
    new Date(occurrence.occurrenceStartMs).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  );
}

function expand(input: {
  startMs: number;
  endMs?: number;
  rule?: CalendarRecurrenceRule | null;
  exceptions?: number[];
  rangeStartMs: number;
  rangeEndMs: number;
}) {
  return listRecurrenceOccurrences({
    startMs: input.startMs,
    endMs: input.endMs ?? input.startMs + HOUR_MS,
    rule: input.rule,
    exceptions: input.exceptions,
    rangeStartMs: input.rangeStartMs,
    rangeEndMs: input.rangeEndMs,
  });
}

describe('non-recurring events', () => {
  test('yields the single instance when it overlaps the window', () => {
    const result = expand({
      startMs: at(2026, 3, 10, 9),
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceStartMs).toBe(at(2026, 3, 10, 9));
    expect(result[0].occurrenceEndMs).toBe(at(2026, 3, 10, 10));
  });

  test('is excluded when it falls outside the window', () => {
    expect(
      expand({
        startMs: at(2026, 5, 10, 9),
        rangeStartMs: at(2026, 3, 1),
        rangeEndMs: at(2026, 4, 1),
      }),
    ).toHaveLength(0);
  });

  test('an event straddling the window start still counts', () => {
    const result = expand({
      startMs: at(2026, 2, 28, 22),
      endMs: at(2026, 3, 1, 2),
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(result).toHaveLength(1);
  });

  test('a zero-length event on the window edge is kept', () => {
    const result = expand({
      startMs: at(2026, 3, 10, 9),
      endMs: at(2026, 3, 10, 9),
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(result).toHaveLength(1);
  });
});

describe('daily', () => {
  test('every day inside the window', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily' },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 5),
    });
    expect(starts(result)).toEqual([
      '03/01/2026, 09:00',
      '03/02/2026, 09:00',
      '03/03/2026, 09:00',
      '03/04/2026, 09:00',
    ]);
  });

  test('interval of 3 skips the days between', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily', interval: 3 },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 11),
    });
    expect(starts(result)).toEqual(['03/01/2026, 09:00', '03/04/2026, 09:00', '03/07/2026, 09:00', '03/10/2026, 09:00']);
  });

  test('COUNT ends the series even when the window reaches further', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily', count: 3 },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(starts(result)).toEqual(['03/01/2026, 09:00', '03/02/2026, 09:00', '03/03/2026, 09:00']);
  });

  test('UNTIL is inclusive', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily', untilMs: at(2026, 3, 3, 9) },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(starts(result)).toEqual(['03/01/2026, 09:00', '03/02/2026, 09:00', '03/03/2026, 09:00']);
  });

  test('a window years after the start does not walk every day to reach it', () => {
    const result = expand({
      startMs: at(2020, 1, 1, 9),
      rule: { freq: 'daily' },
      rangeStartMs: at(2026, 3, 10),
      rangeEndMs: at(2026, 3, 13),
    });
    expect(starts(result)).toEqual(['03/10/2026, 09:00', '03/11/2026, 09:00', '03/12/2026, 09:00']);
  });

  test('exceptions remove just that occurrence', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily' },
      exceptions: [at(2026, 3, 2, 9)],
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 4),
    });
    expect(starts(result)).toEqual(['03/01/2026, 09:00', '03/03/2026, 09:00']);
  });

  test('a runaway rule is capped rather than hanging', () => {
    const result = expand({
      startMs: at(2020, 1, 1, 9),
      rule: { freq: 'daily' },
      rangeStartMs: at(2020, 1, 1),
      rangeEndMs: at(2040, 1, 1),
    });
    expect(result.length).toBeLessThanOrEqual(MAX_RECURRENCE_OCCURRENCES);
  });
});

describe('weekly', () => {
  test('defaults to the start date weekday', () => {
    // 2026-03-02 is a Monday.
    const result = expand({
      startMs: at(2026, 3, 2, 9),
      rule: { freq: 'weekly' },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 29),
    });
    expect(starts(result)).toEqual([
      '03/02/2026, 09:00',
      '03/09/2026, 09:00',
      '03/16/2026, 09:00',
      '03/23/2026, 09:00',
    ]);
  });

  test('BYDAY selects several days a week', () => {
    const result = expand({
      startMs: at(2026, 3, 2, 9),
      rule: { freq: 'weekly', byDay: [{ day: 1 }, { day: 3 }, { day: 5 }] },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 15),
    });
    expect(starts(result)).toEqual([
      '03/02/2026, 09:00',
      '03/04/2026, 09:00',
      '03/06/2026, 09:00',
      '03/09/2026, 09:00',
      '03/11/2026, 09:00',
      '03/13/2026, 09:00',
    ]);
  });

  test('every other week counts whole weeks, not 14-day hops from the start', () => {
    const result = expand({
      startMs: at(2026, 3, 2, 9),
      rule: { freq: 'weekly', interval: 2, byDay: [{ day: 1 }] },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 4, 15),
    });
    expect(starts(result)).toEqual([
      '03/02/2026, 09:00',
      '03/16/2026, 09:00',
      '03/30/2026, 09:00',
      '04/13/2026, 09:00',
    ]);
  });

  test('keeps its wall-clock time across a spring-forward DST change', () => {
    // US DST begins 2026-03-08. A 9am weekly event stays at 9am.
    const result = expand({
      startMs: at(2026, 3, 2, 9),
      rule: { freq: 'weekly' },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 22),
    });
    for (const occurrence of result) {
      expect(new Date(occurrence.occurrenceStartMs).getHours()).toBe(9);
    }
  });
});

describe('monthly', () => {
  test('repeats the start day of the month', () => {
    const result = expand({
      startMs: at(2026, 1, 15, 9),
      rule: { freq: 'monthly' },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2026, 5, 1),
    });
    expect(starts(result)).toEqual([
      '01/15/2026, 09:00',
      '02/15/2026, 09:00',
      '03/15/2026, 09:00',
      '04/15/2026, 09:00',
    ]);
  });

  test('the 31st simply has no instance in a short month', () => {
    const result = expand({
      startMs: at(2026, 1, 31, 9),
      rule: { freq: 'monthly' },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2026, 5, 1),
    });
    expect(starts(result)).toEqual(['01/31/2026, 09:00', '03/31/2026, 09:00']);
  });

  test('the 2nd Tuesday of each month', () => {
    const result = expand({
      startMs: at(2026, 1, 13, 19),
      rule: { freq: 'monthly', byDay: [{ day: 2, ordinal: 2 }] },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(starts(result)).toEqual(['01/13/2026, 19:00', '02/10/2026, 19:00', '03/10/2026, 19:00']);
  });

  test('the last Friday of each month', () => {
    const result = expand({
      startMs: at(2026, 1, 30, 17),
      rule: { freq: 'monthly', byDay: [{ day: 5, ordinal: -1 }] },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(starts(result)).toEqual(['01/30/2026, 17:00', '02/27/2026, 17:00', '03/27/2026, 17:00']);
  });

  test('BYMONTHDAY -1 is the last day of the month', () => {
    const result = expand({
      startMs: at(2026, 1, 31, 12),
      rule: { freq: 'monthly', byMonthDay: [-1] },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2026, 4, 1),
    });
    expect(starts(result)).toEqual(['01/31/2026, 12:00', '02/28/2026, 12:00', '03/31/2026, 12:00']);
  });
});

describe('yearly', () => {
  test('repeats the start month and day', () => {
    const result = expand({
      startMs: at(2026, 7, 4, 12),
      rule: { freq: 'yearly' },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2029, 1, 1),
    });
    expect(starts(result)).toEqual(['07/04/2026, 12:00', '07/04/2027, 12:00', '07/04/2028, 12:00']);
  });

  test('a window years ahead still lands on the right day', () => {
    const result = expand({
      startMs: at(2010, 7, 4, 12),
      rule: { freq: 'yearly' },
      rangeStartMs: at(2026, 1, 1),
      rangeEndMs: at(2027, 1, 1),
    });
    expect(starts(result)).toEqual(['07/04/2026, 12:00']);
  });
});

describe('window clipping', () => {
  test('only occurrences overlapping the window come back', () => {
    const result = expand({
      startMs: at(2026, 3, 1, 9),
      rule: { freq: 'daily' },
      rangeStartMs: at(2026, 3, 10),
      rangeEndMs: at(2026, 3, 13),
    });
    expect(starts(result)).toEqual(['03/10/2026, 09:00', '03/11/2026, 09:00', '03/12/2026, 09:00']);
  });

  test('an inverted window yields nothing', () => {
    expect(
      expand({
        startMs: at(2026, 3, 1, 9),
        rule: { freq: 'daily' },
        rangeStartMs: at(2026, 3, 13),
        rangeEndMs: at(2026, 3, 10),
      }),
    ).toHaveLength(0);
  });

  test('results are sorted and free of duplicates', () => {
    const result = expand({
      startMs: at(2026, 3, 2, 9),
      rule: { freq: 'weekly', byDay: [{ day: 1 }, { day: 1 }, { day: 3 }] },
      rangeStartMs: at(2026, 3, 1),
      rangeEndMs: at(2026, 3, 15),
    });
    const values = result.map((occurrence) => occurrence.occurrenceStartMs);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });
});
