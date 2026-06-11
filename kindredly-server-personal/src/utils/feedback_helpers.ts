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
    snoozeUntilDate: v.snoozeUntilDate,
    starredDate: v.starredDate,
    isHidden: v.isHidden == true,
    archivedDate: v.archivedDate,
    visitTime: v.visitTime,
    lastVisit: v.lastVisit,
    visitCount: v.visitCount,
  };
}
