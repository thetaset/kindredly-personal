import {
  addTaskSubtasks,
  addTaskSubtasksFromItems,
  sanitizeTaskSubtasks,
  taskOccurrenceIsInProgress,
  taskSubtaskProgress,
  taskSubtasksCompletionData,
  taskSubtasksDoneKeys,
  withTaskSubtaskDone,
  TASK_SUBTASKS_MAX,
} from '../src/task.subtasks';
import type { TaskDefinition, TaskOccurrenceView } from '../src/types/task.types';

const subtasks = [
  { key: 'a', title: 'Read chapter 1', itemId: 'item-1' },
  { key: 'b', title: 'Watch the video' },
  { key: 'c', title: 'Worksheet' },
];

function view(overrides: Partial<TaskOccurrenceView> = {}, task: Partial<TaskDefinition> = {}): TaskOccurrenceView {
  return {
    occurrenceId: 't:u:0',
    taskId: 't',
    userId: 'u',
    occurrenceStartMs: 0,
    displayDateMs: 0,
    completed: false,
    subtasksDoneKeys: ['a'],
    task: {
      taskId: 't', accountId: 'acc', createdByUserId: 'u', title: 'Fractions', status: 'active',
      createdAt: 0, updatedAt: 0, assignedUserIds: ['u'], subtasks, ...task,
    },
    ...overrides,
  };
}

describe('sanitizeTaskSubtasks', () => {
  it('keeps good subtasks and drops the rest', () => {
    const out = sanitizeTaskSubtasks([
      { key: 'a', title: '  Read  ', itemId: 'item-1' },
      { key: 'a', title: 'Same key again' },
      { key: 'b', title: '' },
      { title: 'No key' },
      { key: 'c', title: 'Bad item id', itemId: 'x'.repeat(65) },
      null,
      'text',
    ]);
    expect(out).toEqual([
      { key: 'a', title: 'Read', itemId: 'item-1' },
      { key: 'c', title: 'Bad item id' },
    ]);
  });

  it('returns nothing for anything but a list', () => {
    expect(sanitizeTaskSubtasks(undefined)).toEqual([]);
    expect(sanitizeTaskSubtasks({ key: 'a', title: 'x' })).toEqual([]);
  });

  it('stops at the most a task can have', () => {
    const many = Array.from({ length: TASK_SUBTASKS_MAX + 5 }, (_, i) => ({ key: `k${i}`, title: `T${i}` }));
    expect(sanitizeTaskSubtasks(many)).toHaveLength(TASK_SUBTASKS_MAX);
  });
});

describe('adding subtasks', () => {
  it('gives each new subtask its own key and skips blank titles', () => {
    const out = addTaskSubtasks(subtasks, [{ title: 'Quiz' }, { title: '  ' }, { title: 'Map', itemId: 'item-9' }]);
    expect(out.map((s) => s.title)).toEqual(['Read chapter 1', 'Watch the video', 'Worksheet', 'Quiz', 'Map']);
    expect(new Set(out.map((s) => s.key)).size).toBe(5);
    expect(out[4].itemId).toBe('item-9');
  });

  it('makes one subtask per item, in order, once each', () => {
    const out = addTaskSubtasksFromItems(subtasks, [
      { _id: 'item-2', name: 'Video 2' },
      { _id: 'item-1', name: 'Already there' },
      { itemId: 'item-3', name: '', url: 'https://example.com/a.pdf' },
      { _id: 'item-2', name: 'Video 2 again' },
      { _id: '', name: 'No id' },
    ]);
    expect(out.slice(3)).toEqual([
      expect.objectContaining({ title: 'Video 2', itemId: 'item-2' }),
      expect.objectContaining({ title: 'https://example.com/a.pdf', itemId: 'item-3' }),
    ]);
  });
});

describe('ticks', () => {
  it('reads only ticks for subtasks the task still has', () => {
    expect(taskSubtasksDoneKeys({ kind: 'subtasks', doneKeys: ['c', 'gone', 'a', 7] }, subtasks)).toEqual(['a', 'c']);
    expect(taskSubtasksDoneKeys({ kind: 'checklist', doneKeys: ['a'] }, subtasks)).toEqual([]);
    expect(taskSubtasksDoneKeys(undefined, subtasks)).toEqual([]);
    expect(taskSubtasksDoneKeys({ kind: 'subtasks', doneKeys: ['a'] }, [])).toEqual([]);
  });

  it('ticks and unticks in any order', () => {
    let keys = withTaskSubtaskDone([], 'c', true);
    keys = withTaskSubtaskDone(keys, 'a', true);
    keys = withTaskSubtaskDone(keys, 'a', true);
    expect(keys).toEqual(['c', 'a']);
    expect(withTaskSubtaskDone(keys, 'c', false)).toEqual(['a']);
    expect(taskSubtasksCompletionData(keys)).toEqual({ kind: 'subtasks', doneKeys: ['c', 'a'] });
  });

  it('counts progress, and all done only when every subtask is ticked', () => {
    expect(taskSubtaskProgress(subtasks, ['a', 'c'])).toEqual({ done: 2, total: 3, allDone: false });
    expect(taskSubtaskProgress(subtasks, ['a', 'b', 'c'])).toEqual({ done: 3, total: 3, allDone: true });
    expect(taskSubtaskProgress([], [])).toEqual({ done: 0, total: 0, allDone: false });
  });
});

describe('taskOccurrenceIsInProgress', () => {
  it('is a one-off task with subtasks, started and not finished', () => {
    expect(taskOccurrenceIsInProgress(view())).toBe(true);
  });

  it('is not before the first tick, once finished, when skipped, or without subtasks', () => {
    expect(taskOccurrenceIsInProgress(view({ subtasksDoneKeys: [] }))).toBe(false);
    expect(taskOccurrenceIsInProgress(view({ completed: true }))).toBe(false);
    expect(taskOccurrenceIsInProgress(view({ completionStatus: 'skipped' }))).toBe(false);
    expect(taskOccurrenceIsInProgress(view({}, { subtasks: [] }))).toBe(false);
  });

  it('leaves repeating and archived tasks on Tasks', () => {
    expect(taskOccurrenceIsInProgress(view({}, { recurrence: { type: 'daily' } }))).toBe(false);
    expect(taskOccurrenceIsInProgress(view({}, { recurrence: { type: 'none' } }))).toBe(true);
    expect(taskOccurrenceIsInProgress(view({}, { status: 'archived' }))).toBe(false);
  });
});
