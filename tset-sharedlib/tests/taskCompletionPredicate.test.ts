import {
  completedTaskIdsFromStatusList,
  taskStatusEntryIsComplete,
} from '../src/task.utils';

/**
 * The one place "is this task actually done?" is decided.
 *
 * It exists because `TaskService.listStatus` sets `completed = !!completion` and
 * skipping writes a completion row — so a skipped task reports `completed: true`.
 * Anything gating on task completion (the check-in task gate, reward triggers)
 * has to come through here, or skipping becomes the bypass.
 */
describe('taskStatusEntryIsComplete', () => {
  it('counts a genuine completion', () => {
    expect(taskStatusEntryIsComplete({ completed: true, completionStatus: 'completed' })).toBe(true);
  });

  it('REFUSES a skip, even though listStatus reports completed: true', () => {
    expect(taskStatusEntryIsComplete({ completed: true, completionStatus: 'skipped' })).toBe(false);
  });

  it('refuses an untouched occurrence', () => {
    expect(taskStatusEntryIsComplete({ completed: false })).toBe(false);
    expect(taskStatusEntryIsComplete({})).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(taskStatusEntryIsComplete(null)).toBe(false);
    expect(taskStatusEntryIsComplete(undefined)).toBe(false);
  });

  it('trusts a bare completed flag when no status is present', () => {
    // listStatus always sets completionStatus alongside completed, so this only
    // covers malformed or legacy rows. Kept permissive so the reward path does
    // not silently change behaviour for anything that is not a skip.
    expect(taskStatusEntryIsComplete({ completed: true })).toBe(true);
  });
});

describe('completedTaskIdsFromStatusList', () => {
  it('returns only genuinely completed ids', () => {
    const due = [
      { task: { taskId: 'tsk_done' }, completed: true, completionStatus: 'completed' as const },
      { task: { taskId: 'tsk_skipped' }, completed: true, completionStatus: 'skipped' as const },
      { task: { taskId: 'tsk_open' }, completed: false },
    ];

    expect(completedTaskIdsFromStatusList(due)).toEqual(['tsk_done']);
  });

  it('drops entries with no task id rather than emitting empty strings', () => {
    const due = [
      { task: null, completed: true, completionStatus: 'completed' as const },
      { completed: true, completionStatus: 'completed' as const },
    ];

    expect(completedTaskIdsFromStatusList(due)).toEqual([]);
  });

  it('handles an empty or missing list', () => {
    expect(completedTaskIdsFromStatusList([])).toEqual([]);
    expect(completedTaskIdsFromStatusList(null)).toEqual([]);
    expect(completedTaskIdsFromStatusList(undefined)).toEqual([]);
  });
});
