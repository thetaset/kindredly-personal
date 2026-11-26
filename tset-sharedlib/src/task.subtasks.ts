import type { TaskDefinition, TaskOccurrenceView, TaskSubtask } from './types/task.types'

/**
 * A task's subtasks (HAT-1104): lines a person ticks in any order, inside one task.
 *
 * The list is in the task's own record (`TaskDefinition.subtasks`). Each person's ticks are in that
 * occurrence's completion record, which is encrypted, as `completionData: { kind: 'subtasks', doneKeys }`;
 * the record says `completed: false` until the last one is ticked. Ticking never sets an item's Done
 * mark: that mark is stored unencrypted.
 *
 * Types only, like `task.utils.ts`: no client services, storage or Vue.
 */

export const TASK_SUBTASKS_MAX = 100
export const TASK_SUBTASK_TITLE_MAX = 200
const SUBTASK_KEY_MAX = 40
const ITEM_ID_MAX = 64

export type TaskSubtasksCompletionData = { kind: 'subtasks'; doneKeys: string[] }

/**
 * The subtasks worth keeping from anything: drops entries without a key or a title, repeated keys,
 * and anything past `TASK_SUBTASKS_MAX`; trims titles to `TASK_SUBTASK_TITLE_MAX`.
 */
export function sanitizeTaskSubtasks(raw: unknown): TaskSubtask[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: TaskSubtask[] = []
  for (const entry of raw) {
    if (out.length >= TASK_SUBTASKS_MAX) break
    if (!entry || typeof entry !== 'object') continue
    const key = typeof (entry as any).key === 'string' ? (entry as any).key.trim() : ''
    const title = typeof (entry as any).title === 'string' ? (entry as any).title.trim().slice(0, TASK_SUBTASK_TITLE_MAX) : ''
    if (!key || key.length > SUBTASK_KEY_MAX || seen.has(key) || !title) continue
    const rawItemId = typeof (entry as any).itemId === 'string' ? (entry as any).itemId.trim() : ''
    const itemId = rawItemId && rawItemId.length <= ITEM_ID_MAX ? rawItemId : undefined
    seen.add(key)
    out.push(itemId ? { key, title, itemId } : { key, title })
  }
  return out
}

/** A key no subtask in `existing` has. */
export function newTaskSubtaskKey(existing: Iterable<string> = []): string {
  const taken = new Set(existing)
  for (;;) {
    const key = Math.random().toString(36).slice(2, 10)
    if (key.length >= 6 && !taken.has(key)) return key
  }
}

/** `existing` with one new subtask per entry; entries without a title are skipped. */
export function addTaskSubtasks(
  existing: ReadonlyArray<TaskSubtask>,
  entries: ReadonlyArray<{ title?: string | null; itemId?: string | null }>,
): TaskSubtask[] {
  const out = [...existing]
  const keys = new Set(out.map((subtask) => subtask.key))
  for (const entry of entries) {
    if (out.length >= TASK_SUBTASKS_MAX) break
    const title = (entry.title || '').trim().slice(0, TASK_SUBTASK_TITLE_MAX)
    if (!title) continue
    const key = newTaskSubtaskKey(keys)
    keys.add(key)
    const itemId = (entry.itemId || '').trim()
    out.push(itemId ? { key, title, itemId } : { key, title })
  }
  return out
}

/**
 * `existing` with one subtask per item, titled with the item's name, in the order given. An item
 * that already has a subtask, or appears twice, gets one subtask.
 */
export function addTaskSubtasksFromItems(
  existing: ReadonlyArray<TaskSubtask>,
  items: ReadonlyArray<{ _id?: string | null; itemId?: string | null; name?: string | null; url?: string | null }>,
): TaskSubtask[] {
  const seen = new Set(existing.map((subtask) => subtask.itemId).filter(Boolean) as string[])
  const entries: Array<{ title: string; itemId: string }> = []
  for (const item of items) {
    const itemId = (item.itemId || item._id || '').trim()
    if (!itemId || seen.has(itemId)) continue
    seen.add(itemId)
    entries.push({ itemId, title: (item.name || '').trim() || (item.url || '').trim() || 'Untitled' })
  }
  return addTaskSubtasks(existing, entries)
}

/** The ticked keys in a completion record's `completionData`, limited to subtasks the task still has. */
export function taskSubtasksDoneKeys(completionData: unknown, subtasks: ReadonlyArray<TaskSubtask> | null | undefined): string[] {
  const list = subtasks || []
  if (!list.length) return []
  const data = completionData as Partial<TaskSubtasksCompletionData> | null | undefined
  if (!data || data.kind !== 'subtasks' || !Array.isArray(data.doneKeys)) return []
  const ticked = new Set(data.doneKeys.filter((key) => typeof key === 'string'))
  return list.filter((subtask) => ticked.has(subtask.key)).map((subtask) => subtask.key)
}

/** `doneKeys` with `key` ticked or unticked. */
export function withTaskSubtaskDone(doneKeys: ReadonlyArray<string>, key: string, done: boolean): string[] {
  const rest = doneKeys.filter((k) => k !== key)
  return done ? [...rest, key] : rest
}

export function taskSubtasksCompletionData(doneKeys: ReadonlyArray<string>): TaskSubtasksCompletionData {
  return { kind: 'subtasks', doneKeys: [...doneKeys] }
}

/** How many of a task's subtasks are ticked. `allDone` is false for a task without subtasks. */
export function taskSubtaskProgress(
  subtasks: ReadonlyArray<TaskSubtask> | null | undefined,
  doneKeys: ReadonlyArray<string> | null | undefined,
): { done: number; total: number; allDone: boolean } {
  const list = subtasks || []
  const ticked = new Set(doneKeys || [])
  const done = list.filter((subtask) => ticked.has(subtask.key)).length
  return { done, total: list.length, allDone: list.length > 0 && done === list.length }
}

export function taskHasSubtasks(task: Pick<TaskDefinition, 'subtasks'> | null | undefined): boolean {
  return Array.isArray(task?.subtasks) && task!.subtasks!.length > 0
}

/**
 * Whether an occurrence belongs in In progress: a one-off task with subtasks, at least one ticked,
 * not finished and not skipped. A repeating task stays on Tasks.
 */
export function taskOccurrenceIsInProgress(view: TaskOccurrenceView): boolean {
  const task = view.task
  if (!task || task.status === 'archived') return false
  if (task.recurrence && task.recurrence.type !== 'none') return false
  if (view.completed || view.completionStatus === 'skipped') return false
  const progress = taskSubtaskProgress(task.subtasks, view.subtasksDoneKeys)
  return progress.total > 0 && progress.done > 0
}
