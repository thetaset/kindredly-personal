import {ItemFeedbackView} from 'tset-sharedlib/shared.types';

/**
 * Standard feedback fields to select from item_feedback table
 */
export const feedbackFields = [
  'reaction',
  'reactionDate',
  'isReadDate',
  'isReadLaterDate',
  'snoozeUntilDate',
  'archivedDate',
  'starredDate',
  'isHidden',
  'visitTime',
  'lastVisit',
  'visitCount',
  'neverRemindDate',
  'keepFromCleanupDate',
] as const;

export type FeedbackField = (typeof feedbackFields)[number];

/**
 * Type guard to check if a string is a valid feedback field
 */
export function isValidFeedbackField(field: string): field is FeedbackField {
  return (feedbackFields as readonly string[]).includes(field);
}

/**
 * Feedback field names with table prefix for SQL select statements
 */
export const feedbackFieldNaming = feedbackFields.map((v) => `item_feedback.${v} as ${v}`);

/**
 * Extract feedback data from a database row into ItemFeedbackView format
 */
export function getFeedbackData(v: any): ItemFeedbackView {
  return {
    reaction: v.reaction,
    reactionDate: v.reactionDate,
    isReadDate: v.isReadDate,
    isReadLaterDate: v.isReadLaterDate,
    neverRemindDate: v.neverRemindDate,
    keepFromCleanupDate: v.keepFromCleanupDate,
    snoozeUntilDate: v.snoozeUntilDate,
    starredDate: v.starredDate,
    isHidden: v.isHidden == true,
    archivedDate: v.archivedDate,
    visitTime: v.visitTime,
    lastVisit: v.lastVisit,
    visitCount: v.visitCount,
  };
}

/**
 * What a visit record should become, given what is already stored.
 *
 * Pure and shared by the batch and single-item paths so the two can never disagree about
 * recency. Two rules live here:
 *
 *  - **Recency never moves backwards.** The client queue is durable and drains on app boot,
 *    so a device offline for weeks flushes stale stamps; without this they overwrite a newer
 *    visit and make actively-used content look cold on every device.
 *  - **Each column keeps its OWN existing value** when the incoming visit is not newer.
 *    Writing `visitTime` into `lastVisit` erased real recency on rows where `visitTime` was
 *    null but `lastVisit` was set — reachable from unvalidated client input.
 */
export function resolveVisitRecord(
  existing: {lastVisit?: any; visitTime?: any; visitCount?: number} | null | undefined,
  incomingMs: number,
  countThresholdMs: number,
): {lastVisit: any; visitTime: any; visitCount: number} {
  const incoming = new Date(incomingMs);
  if (!existing) {
    return {lastVisit: incoming, visitTime: incoming, visitCount: 1};
  }

  const existingVisitMs = existing.visitTime ? new Date(existing.visitTime).getTime() : 0;
  const incomingIsNewer = Number.isFinite(incomingMs) && incomingMs > existingVisitMs;

  // A visit counts as distinct only when the gap since the last one clears the threshold.
  const countVisit = !existing.visitTime || existingVisitMs < countThresholdMs;

  return {
    lastVisit: incomingIsNewer ? incoming : existing.lastVisit,
    visitTime: incomingIsNewer ? incoming : existing.visitTime,
    visitCount: (existing.visitCount || 0) + (countVisit ? 1 : 0),
  };
}
