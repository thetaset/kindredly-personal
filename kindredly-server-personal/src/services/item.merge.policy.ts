import {KEY_DIL} from '@/templates/email.templates';
import type ItemFeedback from 'tset-sharedlib/schemas/public/ItemFeedback';
import type UserPerm from 'tset-sharedlib/schemas/public/UserPerm';
import {ItemTypeEnum, PermissionType} from 'tset-sharedlib/shared.types';

const FEEDBACK_DATE_FIELDS: string[] = [
  'starredDate',
  'isReadLaterDate',
  'isReadDate',
  'reactionDate',
  'archivedDate',
  'snoozeUntilDate',
  'neverRemindDate',
  'keepFromCleanupDate',
  'visitTime',
  'lastVisit',
  'updatedAt',
  // Legacy columns still present in the database and returned by SELECT *.
  'lastUpdate',
  'isArchived',
];

function permissionRank(value: unknown): number {
  return value === PermissionType.editor ? 2 : value === PermissionType.viewer ? 1 : 0;
}

export function mergeTimeMs(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const parsed = new Date(value as any).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function latestValue<T>(rows: T[], key: string): any {
  return rows.reduce<any>((latest, row) => {
    const candidate = (row as any)[key];
    return mergeTimeMs(candidate) > mergeTimeMs(latest) ? candidate : latest;
  }, null);
}

function earliestValue<T>(rows: T[], key: keyof T): any {
  return rows.reduce<any>((earliest, row) => {
    const candidate = row[key];
    if (candidate == null) return earliest;
    return earliest == null ||
      mergeTimeMs(candidate, Number.MAX_SAFE_INTEGER) < mergeTimeMs(earliest, Number.MAX_SAFE_INTEGER)
      ? candidate
      : earliest;
  }, null);
}

function firstPresent<T>(rows: T[], key: keyof T): any {
  for (const row of rows) {
    const value = row[key];
    if (value != null && value !== '') return value;
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function mergeFeedbackValue(current: any, incoming: any): any {
  if (current == null || current === '') return incoming;
  if (incoming == null || incoming === '') return current;
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const seen = new Set(current.map((value) => JSON.stringify(value)));
    return [
      ...current,
      ...incoming.filter((value) => {
        const key = JSON.stringify(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }
  if (isPlainObject(current) && isPlainObject(incoming)) {
    const merged = {...current};
    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = mergeFeedbackValue(merged[key], value);
    }
    return merged;
  }
  return current;
}

export type MergePreviewItem = {
  _id?: string;
  userId?: string | null;
  type?: string | null;
  published?: boolean | null;
  permanent?: boolean | null;
};

/**
 * Split the requested duplicates into the ones still present and the ones already gone. A copy
 * that no longer exists needs no merge — its removal is the outcome a merge would produce — so
 * tolerating it lets a client with a stale index finish instead of failing the group forever.
 */
export function partitionRemovedIds(removedItemIds: string[], presentIds: Set<string>) {
  return {
    alreadyGoneItemIds: removedItemIds.filter((id) => !presentIds.has(id)),
    mergeableRemovedIds: removedItemIds.filter((id) => presentIds.has(id)),
  };
}

/**
 * Validate a group before any mutation. Each condition gets its own message: one combined
 * sentence covering every rule tells the user nothing they can act on.
 */
export function assertMergeableGroup(items: MergePreviewItem[], survivor: MergePreviewItem): void {
  if (new Set(items.map((item) => item.userId)).size !== 1) {
    throw new Error('These copies do not all have the same owner, so they cannot be merged.');
  }
  if (new Set(items.map((item) => item.type)).size !== 1) {
    throw new Error('These copies are not all the same item type, so they cannot be merged.');
  }
  if (survivor.type === ItemTypeEnum.collection) {
    throw new Error('Collections cannot be merged through duplicate cleanup.');
  }
  if (items.some((item) => item.published || item.permanent)) {
    throw new Error('Published and system-managed items cannot be merged.');
  }
}

export function mergePermissionRows(rows: UserPerm[], survivorItemId: string): UserPerm[] {
  const byUser = new Map<string, UserPerm[]>();
  for (const row of rows) {
    if (!row.userId || permissionRank(row.permission) === 0) continue;
    const entries = byUser.get(row.userId) || [];
    entries.push(row);
    byUser.set(row.userId, entries);
  }

  return [...byUser.entries()].map(([userId, entries]) => {
    const permission = entries.reduce(
      (best, row) => (permissionRank(row.permission) > permissionRank(best) ? row.permission : best),
      PermissionType.viewer as string,
    );
    return {
      _id: `${userId}${KEY_DIL}${survivorItemId}`,
      userId,
      itemId: survivorItemId,
      permission,
      // Union of library membership: visible if any source was visible.
      notInLibrary: entries.every((row) => row.notInLibrary === true),
      sharedByUserId: firstPresent(entries, 'sharedByUserId'),
      createdAt: earliestValue(entries, 'createdAt'),
    };
  });
}

export function mergeFeedbackRows(rows: ItemFeedback[], survivorItemId: string): ItemFeedback[] {
  const byUser = new Map<string, ItemFeedback[]>();
  for (const row of rows) {
    if (!row.userId) continue;
    const entries = byUser.get(row.userId) || [];
    entries.push(row);
    byUser.set(row.userId, entries);
  }

  return [...byUser.entries()].map(([userId, entries]) => {
    const survivorFirst = [...entries].sort((a, b) => {
      if (a.itemId === survivorItemId) return -1;
      if (b.itemId === survivorItemId) return 1;
      return mergeTimeMs(a.createdAt, Number.MAX_SAFE_INTEGER) - mergeTimeMs(b.createdAt, Number.MAX_SAFE_INTEGER);
    });
    const latestVisitRow = [...entries].sort(
      (a, b) => mergeTimeMs(b.lastVisit || b.visitTime) - mergeTimeMs(a.lastVisit || a.visitTime),
    )[0] as any;
    const merged: Record<string, any> = {
      _id: `${userId}${KEY_DIL}${survivorItemId}`,
      userId,
      itemId: survivorItemId,
      data: survivorFirst.reduce((value, row) => mergeFeedbackValue(value, row.data), null),
      notes: survivorFirst.reduce((value, row) => mergeFeedbackValue(value, row.notes), null),
      reaction: firstPresent(
        [...entries].sort((a, b) => mergeTimeMs(b.reactionDate) - mergeTimeMs(a.reactionDate)),
        'reaction',
      ),
      isHidden: entries.some((row) => row.isHidden === true),
      visitCount: entries.reduce((total, row) => total + (Number(row.visitCount) || 0), 0),
      lastVisitId: latestVisitRow?.lastVisitId || null,
      lastVisitContext: latestVisitRow?.lastVisitContext || null,
      createdAt: earliestValue(entries, 'createdAt'),
    };
    for (const field of FEEDBACK_DATE_FIELDS) merged[field] = latestValue(entries, field);
    return merged as ItemFeedback;
  });
}
