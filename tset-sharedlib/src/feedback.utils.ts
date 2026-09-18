/**
 * Item feedback utilities
 * Shared logic for computing feedback attribute updates
 */

/**
 * Feedback update object - uses Date objects for server compatibility
 * Can be serialized to JSON for client transport
 */
export interface FeedbackUpdate {
  isReadDate?: Date | null;
  isReadLaterDate?: Date | null;
  reactionDate?: Date | null;
  starredDate?: Date | null;
  archivedDate?: Date | null;
  snoozeUntilDate?: Date | null;
  neverRemindDate?: Date | null;
  keepFromCleanupDate?: Date | null;
  reaction?: string | null;
  isHidden?: boolean | null;
  updatedAt?: Date | null;
}

/**
 * Valid feedback attribute names that can be updated
 */
export const FEEDBACK_ATTRIBUTES = [
  'isRead',
  'isReadLater',
  'reaction',
  'isArchived',
  'isStarred',
  'starredDate',
  'snoozeUntilDate',
  'neverRemindDate',
  'keepFromCleanupDate',
  'archivedDate',
  'isHidden',
] as const;

export type FeedbackAttributeName = (typeof FEEDBACK_ATTRIBUTES)[number];

/**
 * Validates if an attribute name is a valid feedback attribute
 */
export function isValidFeedbackAttribute(attrName: string): attrName is FeedbackAttributeName {
  return FEEDBACK_ATTRIBUTES.includes(attrName as FeedbackAttributeName);
}

/**
 * Computes the feedback update object for a given attribute change.
 * Handles date attribute mappings and mutual exclusivity rules.
 * 
 * @param attrName - The feedback attribute being updated
 * @param value - The new value for the attribute
 * @param now - Optional date to use for timestamps (defaults to new Date())
 * @returns Partial feedback object with computed updates
 * @throws Error if attrName is not a valid feedback attribute
 * 
 * @example
 * // Mark as read - sets isReadDate
 * computeFeedbackUpdate('isRead', true)
 * // => { isReadDate: Date, updatedAt: Date }
 * 
 * @example
 * // Archive - clears snooze and never remind
 * computeFeedbackUpdate('isArchived', true)
 * // => { archivedDate: Date, snoozeUntilDate: null, neverRemindDate: null, updatedAt: Date }
 */
export function computeFeedbackUpdate(
  attrName: string,
  value: any,
  now: Date = new Date()
): FeedbackUpdate {
  if (!isValidFeedbackAttribute(attrName)) {
    throw new Error(`Invalid feedback attribute: ${attrName}`);
  }

  const feedback: FeedbackUpdate = {};

  // Boolean attributes that set a corresponding date field
  if (['isRead', 'isReadLater', 'reaction'].includes(attrName)) {
    const dateAttr = (attrName + 'Date') as keyof FeedbackUpdate;
    (feedback as any)[dateAttr] = value ? now : null;
  } else if (attrName === 'isStarred') {
    feedback.starredDate = value ? now : null;
  }

  // Read Later is a queue and Complete is its exit: finishing an item takes it out of the
  // queue, and putting an item back in the queue un-finishes it. One rule here rather than
  // two client calls, so the Complete toggle in any list does the same thing as "Done" on
  // the Today "Next up" card.
  if (attrName === 'isRead' && value) {
    feedback.isReadLaterDate = null;
  } else if (attrName === 'isReadLater' && value) {
    feedback.isReadDate = null;
  }

  // Direct value attributes
  if (['reaction', 'isHidden'].includes(attrName)) {
    (feedback as any)[attrName] = value;
  }

  // Snooze handling - clears neverRemind when set
  if (attrName === 'snoozeUntilDate') {
    feedback.snoozeUntilDate = value ? new Date(value) : null;
    feedback.neverRemindDate = null;
  }

  // Keep out of Cleanup. Deliberately touches nothing else: keeping an item is not
  // hiding it from Rediscover, which is why this stopped sharing neverRemindDate.
  if (attrName === 'keepFromCleanupDate') {
    feedback.keepFromCleanupDate = value ? new Date(value) : null;
  }

  // Never remind handling - clears snooze when set
  if (attrName === 'neverRemindDate') {
    feedback.neverRemindDate = value ? new Date(value) : null;
    feedback.snoozeUntilDate = null;
  } 
  // Archive date (explicit date value)
  else if (attrName === 'archivedDate') {
    feedback.archivedDate = value ? new Date(value) : null;
    if (value) {
      feedback.snoozeUntilDate = null;
      feedback.neverRemindDate = null;
    }
  } 
  // Archive boolean - uses current timestamp
  else if (attrName === 'isArchived') {
    feedback.archivedDate = value ? now : null;
    if (value) {
      feedback.snoozeUntilDate = null;
      feedback.neverRemindDate = null;
    }
  }

  feedback.updatedAt = now;

  return feedback;
}
