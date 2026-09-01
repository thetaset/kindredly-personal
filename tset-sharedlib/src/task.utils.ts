import type { TaskDefinition, TaskOccurrenceView } from './types/task.types'

/**
 * Pure recurrence + occurrence math for tasks/routines.
 *
 * Deliberately dependency-free (types only) so the background service, the UI,
 * and a future standalone Routines app can all share one implementation. Do not
 * import client services, storage, or Vue from here.
 */

export const GLOBAL_TASK_COMPLETION_OWNER_ID = '__task_global__'

const DAY_MS = 24 * 60 * 60 * 1000

/** The shape `TaskService.listStatus` returns per occurrence, structurally. */
export type TaskStatusEntry = {
  task?: { taskId?: string } | null
  completed?: boolean
  completionStatus?: 'completed' | 'skipped'
}

/**
 * Whether one `listStatus` entry counts as genuinely done.
 *
 * `completed` alone is NOT the answer, and this is the whole reason this helper
 * exists. `listStatus` sets `completed = !!completion`, and skipping writes a
 * completion row with `completionStatus: 'skipped'` — so a skipped task reports
 * `completed: true`. A user can skip their own recurring task, which would make
 * any "did you finish?" check trivially bypassable.
 *
 * Every caller that gates something on task completion must come through here.
 */
export function taskStatusEntryIsComplete(entry: TaskStatusEntry | null | undefined): boolean {
  if (!entry) return false
  if (entry.completionStatus === 'skipped') return false
  return entry.completionStatus === 'completed' || entry.completed === true
}

/** The ids from a `listStatus` result that are genuinely done. */
export function completedTaskIdsFromStatusList(
  due: ReadonlyArray<TaskStatusEntry> | null | undefined,
): string[] {
  return (due ?? [])
    .filter(taskStatusEntryIsComplete)
    .map((entry) => entry.task?.taskId || '')
    .filter(Boolean)
}

export function toStartOfLocalDayMs(ms: number): number {
  const day = new Date(ms)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

export function getCompletionOwnerIdForTask(input: {
  viewerType: string
  forUserId: string
  task: TaskDefinition
}): string | undefined {
  const scope = input.task?.completionScope === 'once' ? 'once' : 'per_user'
  if (scope === 'once') return GLOBAL_TASK_COMPLETION_OWNER_ID
  return input.viewerType === 'admin' ? input.forUserId : undefined
}

/**
 * The first moment a recurring task can legitimately have an occurrence.
 *
 * Without this, expanding a recurrence over a backward-looking window invents
 * occurrences for every day before the task existed, and each one is scored as
 * missed — so a routine created today reports weeks of failure on the
 * follow-through view. Clamp to the local day the task was created.
 */
export function getRecurrenceStartMs(task: TaskDefinition): number {
  const createdAt = typeof task?.createdAt === 'number' && Number.isFinite(task.createdAt)
    ? task.createdAt
    : undefined
  if (createdAt === undefined) return Number.NEGATIVE_INFINITY
  return toStartOfLocalDayMs(createdAt)
}

export function getOccurrenceStartMs(input: {
  task: TaskDefinition
  nowMs: number
}): number {
  const { task, nowMs } = input

  const r = task.recurrence
  if (!r || r.type === 'none') return task.createdAt

  const resetHour = r.resetHourLocal ?? 0
  const now = new Date(nowMs)

  if (r.type === 'daily') {
    const start = new Date(now)
    start.setHours(resetHour, 0, 0, 0)

    // If we're before resetHour today, the window started yesterday at resetHour.
    if (now.getTime() < start.getTime()) {
      start.setDate(start.getDate() - 1)
    }

    return start.getTime()
  }

  // weekly
  const days = r.daysOfWeek && r.daysOfWeek.length > 0 ? r.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
  const normalized = new Set(days.map((d) => ((d % 7) + 7) % 7))

  const start = new Date(now)
  start.setHours(resetHour, 0, 0, 0)

  // Walk backwards until we hit an included day, with the same reset-hour semantics.
  for (let i = 0; i < 8; i++) {
    const candidateDay = start.getDay()
    const candidateOk = normalized.has(candidateDay)

    if (candidateOk) {
      if (i === 0 && now.getTime() < start.getTime()) {
        start.setDate(start.getDate() - 1)
        continue
      }
      return start.getTime()
    }

    start.setDate(start.getDate() - 1)
  }

  // Fallback
  return nowMs
}

export function getDueAtMsForOccurrence(input: {
  task: TaskDefinition
  occurrenceStartMs: number
}): number | undefined {
  const { task, occurrenceStartMs } = input

  const r = task.recurrence
  if (!r || r.type === 'none') {
    return task.dueAtMs
  }

  const dueTime = r.dueTimeLocal
  if (!dueTime) return undefined

  const due = new Date(occurrenceStartMs)
  due.setHours(dueTime.hour, dueTime.minute, 0, 0)

  // Ensure dueAt is not before the occurrence window start (e.g. resetHourLocal > due time).
  if (due.getTime() <= occurrenceStartMs) {
    due.setDate(due.getDate() + 1)
  }

  return due.getTime()
}

/**
 * Which day a task shows on.
 *
 * `dueAtMs` first because it is the most specific answer, then the date-only `dueDateMs`, then
 * the occurrence window. Falling through to `occurrenceStartMs` for a one-off task means
 * `createdAt` — the day it was typed — which is why an untimed task needed its own field
 * rather than an absent `dueAtMs` (UX-035).
 */
export function getDisplayDateMs(input: {
  occurrenceStartMs: number
  dueAtMs?: number
  dueDateMs?: number
}): number {
  return toStartOfLocalDayMs(input.dueAtMs ?? input.dueDateMs ?? input.occurrenceStartMs)
}

/**
 * The day a one-off task is due, whichever field carries it, or undefined if it has no day.
 * Recurring tasks get their day from the recurrence, so this only answers for `type === 'none'`.
 */
export function getOneOffDueDayMs(task: TaskDefinition): number | undefined {
  const r = task.recurrence
  if (r && r.type !== 'none') return undefined
  const carrier = typeof task.dueAtMs === 'number' && Number.isFinite(task.dueAtMs)
    ? task.dueAtMs
    : (typeof task.dueDateMs === 'number' && Number.isFinite(task.dueDateMs) ? task.dueDateMs : undefined)
  return carrier === undefined ? undefined : toStartOfLocalDayMs(carrier)
}

export function listOccurrenceStartMsForRange(input: {
  task: TaskDefinition
  startMs: number
  endMs: number
}): number[] {
  const { task, startMs, endMs } = input
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return []

  const recurrence = task.recurrence
  if (!recurrence || recurrence.type === 'none') {
    // Either carrier puts the task in the range. Reading only `dueAtMs` here is what kept a
    // date-only task off the calendar entirely — it has a day, just not a time (UX-035).
    const dueMs = typeof task.dueAtMs === 'number' && Number.isFinite(task.dueAtMs)
      ? task.dueAtMs
      : (typeof task.dueDateMs === 'number' && Number.isFinite(task.dueDateMs) ? task.dueDateMs : undefined)
    if (dueMs === undefined) return []
    if (dueMs < startMs || dueMs >= endMs) return []
    return [task.createdAt]
  }

  // Never generate occurrences from before the task existed.
  const recurrenceStartMs = getRecurrenceStartMs(task)
  const effectiveStartMs = Math.max(startMs, recurrenceStartMs)
  if (effectiveStartMs >= endMs) return []

  const searchStartMs = effectiveStartMs - DAY_MS
  const resetHour = recurrence.resetHourLocal ?? 0
  const cursor = new Date(searchStartMs)
  cursor.setHours(resetHour, 0, 0, 0)
  if (cursor.getTime() < searchStartMs) {
    cursor.setDate(cursor.getDate() + 1)
  }

  const allowedDays = recurrence.type === 'weekly'
    ? new Set((recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
      ? recurrence.daysOfWeek
      : [0, 1, 2, 3, 4, 5, 6]).map((day) => ((day % 7) + 7) % 7))
    : null

  const occurrenceStartMsList: number[] = []
  while (cursor.getTime() < endMs) {
    const occurrenceStartMs = cursor.getTime()
    const isAllowedDay = !allowedDays || allowedDays.has(cursor.getDay())

    if (isAllowedDay && occurrenceStartMs >= recurrenceStartMs) {
      const dueAtMs = getDueAtMsForOccurrence({ task, occurrenceStartMs })
      const displayAtMs = dueAtMs ?? occurrenceStartMs
      if (displayAtMs >= effectiveStartMs && displayAtMs < endMs) {
        occurrenceStartMsList.push(occurrenceStartMs)
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return occurrenceStartMsList
}

export function buildTaskOccurrenceView(input: {
  task: TaskDefinition
  userId: string
  occurrenceStartMs: number
  completed: boolean
  completionStatus?: 'completed' | 'skipped'
  completionAtMs?: number
  completionNote?: string
  completedByUserId?: string
  nowMs: number
}): TaskOccurrenceView {
  const { task, userId, occurrenceStartMs, completed, completionStatus, completionAtMs, completionNote, completedByUserId, nowMs } = input
  const dueAtMs = getDueAtMsForOccurrence({ task, occurrenceStartMs })
  const displayDateMs = getDisplayDateMs({ occurrenceStartMs, dueAtMs, dueDateMs: task.dueDateMs })
  const occurrenceIdentityUserId = task.completionScope === 'once' ? GLOBAL_TASK_COMPLETION_OWNER_ID : userId

  return {
    occurrenceId: `${task.taskId}:${occurrenceIdentityUserId}:${occurrenceStartMs}`,
    taskId: task.taskId,
    task,
    userId,
    occurrenceStartMs,
    dueAtMs,
    displayDateMs,
    completed,
    completionStatus,
    completionAtMs,
    completionNote,
    completedByUserId,
    overdue: !completed && typeof dueAtMs === 'number' ? nowMs > dueAtMs : false,
  }
}

export function compareTaskOccurrenceViews(a: TaskOccurrenceView, b: TaskOccurrenceView): number {
  if (a.displayDateMs !== b.displayDateMs) return a.displayDateMs - b.displayDateMs

  const aSortMs = a.dueAtMs ?? a.occurrenceStartMs
  const bSortMs = b.dueAtMs ?? b.occurrenceStartMs
  if (aSortMs !== bSortMs) return aSortMs - bSortMs

  return a.taskId.localeCompare(b.taskId)
}

/**
 * The exact ref_state subkeys backing a set of occurrences.
 *
 * Completions are stored one row per occurrence under `occ:<occurrenceStartMs>`,
 * so a caller that already knows its window can ask for precisely those rows
 * instead of paging "the most recent N" and silently losing older history.
 */
export function toCompletionStateSubKey(occurrenceStartMs: number): string {
  return `occ:${occurrenceStartMs}`
}

export function toCompletionStateSubKeys(occurrenceStartMsList: number[]): string[] {
  return occurrenceStartMsList.map(toCompletionStateSubKey)
}
