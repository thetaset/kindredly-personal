import {RequestContext} from '@/base/request_context';
import {UserPrefRepo} from '@/db/user_pref.repo';
import {UserRepo} from '@/db/user.repo';
import knex from '@/db/knex_config';
import type {
  SharedFeedbackFeedListRequest,
  SharedFeedbackFeedListResponse,
  SharedFeedbackFeedMarkSeenRequest,
  SharedFeedbackFeedMarkSeenResponse,
} from 'tset-sharedlib/api';

const PREF_KEY = 'sharedFeedbackFeed';

type SharedFeedbackPrefs = {
  lastSeenAt?: string;
  lastDismissedAt?: string;
};

function parsePrefValue(value: unknown): SharedFeedbackPrefs | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as SharedFeedbackPrefs;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as SharedFeedbackPrefs;
  }
  return null;
}

function maxIso(a?: string, b?: string): string | undefined {
  const ta = a ? new Date(a).getTime() : NaN;
  const tb = b ? new Date(b).getTime() : NaN;

  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return undefined;
  if (!Number.isFinite(ta)) return b;
  if (!Number.isFinite(tb)) return a;
  return ta >= tb ? a : b;
}

export class SharedFeedbackFeedService {
  private users = new UserRepo();
  private userPref = new UserPrefRepo();

  async list(
    ctx: RequestContext,
    viewerUserId: string,
    req: SharedFeedbackFeedListRequest,
  ): Promise<SharedFeedbackFeedListResponse> {
    await ctx.verifySelfOrAdmin(viewerUserId);

    const sinceDays = Math.max(1, Math.min(30, Math.round(req.sinceDays ?? 7)));
    const limit = Math.max(1, Math.min(200, Math.round(req.limit ?? 50)));
    const onlyAfterLastSeen = req.onlyAfterLastSeen !== false;

    const prefRecord = await this.userPref
      .query()
      .where({userId: viewerUserId, key: PREF_KEY} as any)
      .first();

    const prefs = parsePrefValue(prefRecord?.value) || {};
    const after = onlyAfterLastSeen ? prefs.lastSeenAt : undefined;

    const accountUsers = await this.users.findMany({accountId: ctx.accountId} as any);
    const actorUserIds = accountUsers
      .filter((u: any) => !u?.deleted && !u?.disabled)
      .map((u: any) => u._id)
      .filter((id: string) => id && id !== viewerUserId);

    if (actorUserIds.length === 0) {
      return {events: [], prefs};
    }

    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const afterDate = after ? new Date(after) : null;

    const rows = await knex
      .from('item_feedback as f')
      .join('user as u', 'u._id', 'f.userId')
      .join('item as i', 'i._id', 'f.itemId')
      .whereIn('f.userId', actorUserIds)
      .whereNotNull('f.reactionDate')
      .whereNotNull('f.reaction')
      .andWhere('f.reactionDate', '>=', since)
      .modify((q) => {
        if (afterDate && Number.isFinite(afterDate.getTime())) {
          q.andWhere('f.reactionDate', '>', afterDate);
        }
      })
      .orderBy('f.reactionDate', 'desc')
      .limit(limit)
      .select([
        'f.userId as actorUserId',
        'u.username as actorUsername',
        'u.displayedName as actorDisplayedName',
        'u.profileImage as actorProfileImage',
        'f.itemId as itemId',
        'i.type as itemType',
        'i.url as itemUrl',
        'i.name as itemName',
        'f.reaction as reaction',
        'f.reactionDate as reactionDate',
      ]);

    const events = rows.map((r: any) => {
      const at = typeof r.reactionDate === 'string' ? r.reactionDate : new Date(r.reactionDate).toISOString();

      return {
        eventId: `${r.actorUserId}:${r.itemId}:reaction:${at}`,
        actor: {
          userId: r.actorUserId,
          displayedName: r.actorDisplayedName || undefined,
          username: r.actorUsername,
          profileImage: r.actorProfileImage || undefined,
        },
        item: {
          id: r.itemId,
          type: r.itemType,
          url: r.itemUrl || undefined,
          name: r.itemName || undefined,
        },
        feedback: {
          type: 'reaction' as const,
          reaction: r.reaction,
          at,
        },
      };
    });

    return {events, prefs};
  }

  async markSeen(
    ctx: RequestContext,
    viewerUserId: string,
    req: SharedFeedbackFeedMarkSeenRequest,
  ): Promise<SharedFeedbackFeedMarkSeenResponse> {
    await ctx.verifySelfOrAdmin(viewerUserId);

    const existing = await this.userPref
      .query()
      .where({userId: viewerUserId, key: PREF_KEY} as any)
      .first();

    const prev = parsePrefValue(existing?.value) || {};

    const next: SharedFeedbackPrefs = {
      lastSeenAt: maxIso(prev.lastSeenAt, req.seenAt),
      lastDismissedAt: maxIso(prev.lastDismissedAt, req.dismissedAt),
    };

    const id = this.userPref.prefId(viewerUserId, PREF_KEY);

    await this.userPref.save({
      _id: id,
      userId: viewerUserId,
      key: PREF_KEY,
      value: next,
      updatedAt: new Date(),
    } as any);

    return {success: true};
  }
}
