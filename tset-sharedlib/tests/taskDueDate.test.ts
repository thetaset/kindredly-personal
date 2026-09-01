import {
  getDisplayDateMs,
  getOneOffDueDayMs,
  listOccurrenceStartMsForRange,
} from '../src/task.utils';
import type { TaskDefinition } from '../src/types/task.types';

/**
 * A one-off task's only day-carrier used to be `dueAtMs`, documented as "a specific date+time".
 * So "due Tuesday, no particular time" could not be expressed: clearing the time did not make
 * the task untimed, it sent it back to `createdAt` — the day it was typed (UX-035). `dueDateMs`
 * is the day-only carrier. These pin the two apart.
 */
const CREATED_AT = new Date(2026, 5, 1, 14, 30).getTime(); // 1 June, mid-afternoon
const DUE_DAY = new Date(2026, 8, 1, 0, 0, 0, 0).getTime(); // 1 September, start of day
const DUE_MOMENT = new Date(2026, 8, 1, 16, 30).getTime(); // 1 September, 4:30pm

function task(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    taskId: 't1',
    accountId: 'a1',
    createdByUserId: 'u1',
    title: 'Take out the bins',
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    assignedUserIds: ['u1'],
    recurrence: { type: 'none' },
    ...overrides,
  };
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

describe('a one-off task due on a day, at no particular time', () => {
  it('shows on the day it is due, not the day it was created', () => {
    expect(getDisplayDateMs({ occurrenceStartMs: CREATED_AT, dueDateMs: DUE_DAY })).toBe(DUE_DAY);
    expect(getDisplayDateMs({ occurrenceStartMs: CREATED_AT, dueDateMs: DUE_DAY })).not.toBe(
      startOfDay(CREATED_AT),
    );
  });

  it('still falls back to the creation day when it has no due date at all', () => {
    expect(getDisplayDateMs({ occurrenceStartMs: CREATED_AT })).toBe(startOfDay(CREATED_AT));
  });

  it('lets an exact time win, so a task that gains one need not clear the other field', () => {
    expect(
      getDisplayDateMs({ occurrenceStartMs: CREATED_AT, dueAtMs: DUE_MOMENT, dueDateMs: DUE_DAY }),
    ).toBe(DUE_DAY);
  });

  it('appears in a calendar range that contains its day', () => {
    const rangeStart = new Date(2026, 7, 30).getTime();
    const rangeEnd = new Date(2026, 8, 6).getTime();
    // Reading only dueAtMs here is what kept a date-only task off the calendar entirely.
    expect(
      listOccurrenceStartMsForRange({ task: task({ dueDateMs: DUE_DAY }), startMs: rangeStart, endMs: rangeEnd }),
    ).toEqual([CREATED_AT]);
  });

  it('stays out of a range that does not contain its day', () => {
    const rangeStart = new Date(2026, 9, 1).getTime();
    const rangeEnd = new Date(2026, 9, 8).getTime();
    expect(
      listOccurrenceStartMsForRange({ task: task({ dueDateMs: DUE_DAY }), startMs: rangeStart, endMs: rangeEnd }),
    ).toEqual([]);
  });

  it('is still absent from every range when it has no due date', () => {
    expect(
      listOccurrenceStartMsForRange({
        task: task(),
        startMs: new Date(2026, 5, 1).getTime(),
        endMs: new Date(2026, 5, 8).getTime(),
      }),
    ).toEqual([]);
  });
});

describe('getOneOffDueDayMs', () => {
  it('reads the day from either carrier', () => {
    expect(getOneOffDueDayMs(task({ dueDateMs: DUE_DAY }))).toBe(DUE_DAY);
    expect(getOneOffDueDayMs(task({ dueAtMs: DUE_MOMENT }))).toBe(DUE_DAY);
  });

  it('prefers the exact time when a task carries both', () => {
    expect(getOneOffDueDayMs(task({ dueAtMs: DUE_MOMENT, dueDateMs: DUE_DAY }))).toBe(DUE_DAY);
  });

  it('answers nothing for a task with no due date', () => {
    expect(getOneOffDueDayMs(task())).toBeUndefined();
  });

  it('answers nothing for a recurring task, whose day comes from the recurrence', () => {
    expect(
      getOneOffDueDayMs(task({ recurrence: { type: 'daily' }, dueDateMs: DUE_DAY })),
    ).toBeUndefined();
  });
});
