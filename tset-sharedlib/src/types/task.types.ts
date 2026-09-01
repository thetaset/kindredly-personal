/**
 * Tasks and Task Gates
 *
 * Tasks are general household to-dos that can be assigned to any user.
 * Task Gates are optional enforcement settings that can restrict access based on task completion.
 */

export type TaskStatus = 'active' | 'archived'

export type TaskCompletePolicy = 'admin_only' | 'child_allowed' | 'either'

export type TaskRecurrenceType = 'none' | 'daily' | 'weekly'

export type TaskEvidenceType = 'manual' | 'activity' | 'item_reference'

export type TaskEvidenceConditionType = 'urlPatterns' | 'eduValue' | 'attribute'

export type TaskEvidenceCondition = {
  type: TaskEvidenceConditionType
  values: string[]
}

export type TaskCompletionScope = 'per_user' | 'once'

export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskEvidence =
  | {
      type: 'manual'
    }
  | {
      type: 'item_reference'
    }
  | {
      type: 'activity'
      conditions: TaskEvidenceCondition[]
      requiredDurationMs?: number
    }

export type TaskRecurrence = {
  type: TaskRecurrenceType
  daysOfWeek?: number[]
  resetHourLocal?: number
  /**
   * Optional local due time (assignee's local time) for recurring tasks.
   * Example: "finished by 20:00".
   */
  dueTimeLocal?: { hour: number; minute: number }
  /**
   * IANA timezone id, e.g. "America/Los_Angeles".
   * If omitted, clients may fall back to the assignee’s current device timezone.
   */
  timeZoneId?: string
}

export type TaskDefinition = {
  taskId: string
  accountId: string
  createdByUserId: string
  title: string
  details?: string
  status: TaskStatus
  createdAt: number
  updatedAt: number

  priority?: TaskPriority

  assignedUserIds: string[]

  /**
   * Controls whether completion is tracked per-assignee (default) or shared.
   * - per_user: each assignee has their own completion
   * - once: completed once for everyone (shared)
   */
  completionScope?: TaskCompletionScope

  /**
   * If true, restricted users may view this task even when they are not assigned.
   * Intended for general household tasks like chores that should be visible to kids.
   */
  visibleToRestricted?: boolean

  /**
   * If true, other admin users in the family can view this task (read-only) when viewing another admin.
   * Intended to avoid leaking private admin tasks by default.
   */
  sharedWithFamily?: boolean

  /**
   * Optional absolute due timestamp for one-off tasks (recurrence.type === 'none').
   * If provided, this is a specific date+time.
   */
  dueAtMs?: number

  /**
   * The day a one-off task is due, when it is due on a day but at no particular time
   * ("take out the bins on Tuesday"). Start of that local day, in ms.
   *
   * Tasks needed their own field for this; events carry `allDay` instead. Before it existed
   * `dueAtMs` was the ONLY day-carrier a one-off task had, so clearing the time did not make
   * the task untimed — it sent it back to `createdAt`, the day it was typed, which is only
   * ever right by coincidence (UX-035). A midnight `dueAtMs` could not stand in either: it
   * makes "due at 00:00" and "due, no time" indistinguishable.
   *
   * Set at most one of `dueAtMs` and `dueDateMs`. `dueAtMs` wins if both are present, so a
   * task that gains a time does not have to have this cleared in the same write.
   */
  dueDateMs?: number

  linkedItemIds?: string[]
  sourceItemId?: string
  linkType?: 'project' | 'reference' | 'reading' | 'custom'

  recurrence?: TaskRecurrence
  evidence?: TaskEvidence

  completePolicy?: TaskCompletePolicy
  requiresApproval?: boolean
}

export type TaskCompletionBy = 'admin' | 'child' | 'system'

export type TaskCompletionStatus = 'completed' | 'skipped'

export type TaskCompletion = {
  taskId: string
  userId: string
  occurrenceStartMs: number
  completedAtMs: number
  completedBy: TaskCompletionBy
  /**
   * Optional status for this occurrence.
   * - completed: normal completion
   * - skipped: intentionally skipped (used for recurring tasks)
   */
  status?: TaskCompletionStatus
  note?: string
  evidenceSummary?: { type: 'activity' | 'manual'; details?: any }
}

export type TaskOccurrenceView = {
  occurrenceId: string
  taskId: string
  task: TaskDefinition
  userId: string
  occurrenceStartMs: number
  dueAtMs?: number
  displayDateMs: number
  completed: boolean
  completionStatus?: TaskCompletionStatus
  completionAtMs?: number
  completionNote?: string
  completedByUserId?: string
  overdue?: boolean
}

export type TaskGateScope = 'internet' | 'content_types'

export type TaskGateSettings = {
  enabled: boolean
  requiredTaskIds: string[]
  scope: TaskGateScope
  contentTypes?: Array<'Entertainment' | 'Social' | 'Junk'>
  blockMode: 'restrictAll' | 'libraryOnly'
}
