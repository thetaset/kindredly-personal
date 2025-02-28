
export default  interface ItemFeedback {
  _id?: string;


  itemId?: string | null;

  userId?: string | null;

  isHidden?: boolean | null;

  data?: unknown | null;

  starredDate?: Date | null;

  isReadLaterDate?: Date | null;

  isReadDate?: Date | null;

  reactionDate?: Date | null;

  reaction?: string;

  archivedDate?: Date | null;

  snoozeUntilDate?: Date | null;

  neverRemindDate?: Date | null;

  notes?: unknown | null;

  visitCount?: number | null;

  visitTime?: Date | null;

  updatedAt?: Date | null;

  lastVisit?: Date | null;

  createdAt?: Date | null;
}
