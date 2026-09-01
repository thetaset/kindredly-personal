import {RequestContext} from '@/base/request_context';
import {clampPerPage} from '@/utils/pagination_utils';
import {v4 as uuidv4} from 'uuid';

import {CommentRepo} from '@/db/comment.repo';
import {UserRepo} from '@/db/user.repo';
import {UserFeedRepo} from '@/db/user_feed.repo';
import {DynObj} from '@/types';
import {filterToFields} from '@/utils/parse_utils';
import {ReactionRepo} from '@/db/reaction.repo';

class UserFeedService {
  private userFeed = new UserFeedRepo();
  private usersRepo = new UserRepo();
  private commentsRepo = new CommentRepo();
  private reactionsRepo = new ReactionRepo();

  private _toValidDate(value?: string | Date | null) {
    if (!value) return null;

    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
  }

  _feedQuery(userId) {
    return this.userFeed
      .query()
      .from('user_feed')
      .where('user_feed.userId', userId)
      .whereNot('user_feed.isDeleted', true)
      .leftJoin('post', 'post._id', 'user_feed.refId')
      .leftJoin('user', 'user._id', 'post.userId')
      .where('post.deletedAt', null);
  }

  private async _buildFeedListResponse(
    feedEntries: any[],
    includeComments = false,
    includeReactions = true,
    includeTotalRows = false,
  ) {
    const commentsLookup: Record<string, any[]> = {};
    const postIds = feedEntries.filter((v) => v.refType == 'post').map((v) => v._id);

    if (includeComments && postIds.length > 0) {
      const comments = await this.commentsRepo
        .query()
        .from('comment')
        .where('comment.refType', 'post')
        .whereIn('comment.refId', postIds)
        .where('deletedAt', null)

        .join('user', 'user._id', 'comment.userId')
        .select('comment.*', 'user.username', 'user.profileImage', 'user.displayedName')
        .orderBy('createdAt', 'asc');

      comments.forEach((v) => {
        if (!commentsLookup[v.refId]) commentsLookup[v.refId] = [];
        commentsLookup[v.refId].push(v);
      });
    }

    const reactionLookup: Record<string, any[]> = {};

    if (includeReactions && postIds.length > 0) {
      const reactions = await this.reactionsRepo
        .query()
        .from('reaction')
        .where('reaction.refType', 'post')
        .whereIn('reaction.refId', postIds)
        .join('user', 'user._id', 'reaction.userId')
        .select('reaction.*', 'user.username', 'user.profileImage', 'user.displayedName')
        .orderBy('createdAt', 'asc');

      reactions.forEach((v) => {
        if (!reactionLookup[v.refId]) reactionLookup[v.refId] = [];
        reactionLookup[v.refId].push(v);
      });
    }

    const usersIds = [];
    feedEntries.forEach((v) => {
      if (v.sharedWith) usersIds.push(...v.sharedWith);
    });

    const userList = (await this.usersRepo.findWhereIdIn(usersIds)).map((v) =>
      filterToFields(['_id', 'profileImage', 'username', 'displayedName'], v),
    );
    const userLookup = Object.fromEntries(userList.map((v: any) => [v._id, v]));

    const results = feedEntries.map((v) => {
      if (v.refType == 'post' && v.sharedWith) {
        v.sharedWithUsers = v.sharedWith.map((v) => userLookup[v]);
      }

      let data = null;
      if (v.refType == 'post') {
        data = {
          ...v,
          comments: commentsLookup[v._id] || [],
          reactions: reactionLookup[v._id] || [],
        };
      }
      return {
        _id: v.feedId,
        refType: v.refType,
        feedEntry: {
          _id: v.feedId,
          isRead: v.feedIsRead,
          feedInfo: v.feedInfo,
          createdAt: v.feedCreatedAt,
        },
        data,
      };
    });

    if (!includeTotalRows) return {records: results, count: null};
    return {records: results, count: 1000};
  }

  async listByUserId(
    ctx: RequestContext,
    targetUserId: string,
    pageInfo: DynObj,
    includeComments = false,
    includeReactions = true,
    newOnly = false,
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const safePageInfo = pageInfo || {};
    const {currentPage, perPage, includeTotalRows} = safePageInfo;
    const safePerPage = clampPerPage(perPage, 10);
    const safeCurrentPage = Math.max(0, Number(currentPage || 0));

    const feedQuery = this._feedQuery(targetUserId);
    if (newOnly) {
      // Mirror countUnreadByUserId so the "New" list and the unread badge stay consistent.
      feedQuery.whereNot('user_feed.isRead', true);
    }

    // Peek one row past the page so hasMore reflects raw feed rows — the shareGroup
    // dedup below can shrink a full page, which must not read as "no more posts".
    const feedEntries = await feedQuery
      .limit(safePerPage + 1)
      .offset(safeCurrentPage * safePerPage)
      .orderBy('user_feed.createdAt', 'desc')
      .select(
        'post.*',
        'user.username',
        'user.displayedName',
        'user.profileImage',
        'user_feed.createdAt as feedCreatedAt',
        'user_feed._id as feedId',
        'user_feed.isRead as feedIsRead',
        'user_feed.info as feedInfo',
        'user_feed.refType as refType',
      );

    const hasMore = feedEntries.length > safePerPage;
    if (hasMore) feedEntries.pop();

    // Grouped posts fan out to one sibling per group, and the author is a member of every
    // sibling — so the author's own feed would otherwise show the same logical post N times.
    // Collapse the author's own siblings to a single entry (which carries shareGroupId, so
    // the post view can render per-group thread tabs). Recipients are in exactly one sibling,
    // so their feeds are unaffected.
    const dedupedEntries: any[] = [];
    const seenAuthorShareGroups = new Set<string>();
    for (const entry of feedEntries) {
      const shareGroupId = entry?.shareGroupId;
      if (shareGroupId && entry?.userId === targetUserId) {
        if (seenAuthorShareGroups.has(shareGroupId)) continue;
        seenAuthorShareGroups.add(shareGroupId);
      }
      dedupedEntries.push(entry);
    }

    const response = await this._buildFeedListResponse(
      dedupedEntries,
      includeComments,
      includeReactions,
      includeTotalRows === true,
    );
    return {...response, hasMore};
  }

  async searchPostsByUserId(
    ctx: RequestContext,
    targetUserId: string,
    options: {
      limit?: number;
      includeComments?: boolean;
      createdAfter?: string;
      cursor?: {createdAt?: string; feedId?: string};
    } = {},
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const limit = Math.max(1, Math.min(100, Number(options.limit || 50)));
    const includeComments = options.includeComments !== false;
    const createdAfter = this._toValidDate(options.createdAfter);
    const cursorCreatedAt = this._toValidDate(options.cursor?.createdAt);
    const cursorFeedId = typeof options.cursor?.feedId === 'string' ? options.cursor.feedId : '';

    const feedQuery = this._feedQuery(targetUserId).andWhere('user_feed.refType', '=', 'post');

    if (createdAfter) {
      feedQuery.andWhere('user_feed.createdAt', '>=', createdAfter);
    }

    if (cursorCreatedAt && cursorFeedId) {
      feedQuery.andWhere((query) => {
        query.where('user_feed.createdAt', '<', cursorCreatedAt).orWhere((innerQuery) => {
          innerQuery.where('user_feed.createdAt', '=', cursorCreatedAt).andWhere('user_feed._id', '<', cursorFeedId);
        });
      });
    }

    const feedEntries = await feedQuery
      .limit(limit)
      .orderBy('user_feed.createdAt', 'desc')
      .orderBy('user_feed._id', 'desc')
      .select(
        'post.*',
        'user.username',
        'user.displayedName',
        'user.profileImage',
        'user_feed.createdAt as feedCreatedAt',
        'user_feed._id as feedId',
        'user_feed.isRead as feedIsRead',
        'user_feed.info as feedInfo',
        'user_feed.refType as refType',
      );

    return await this._buildFeedListResponse(feedEntries, includeComments, true, false);
  }

  _feedQuery2(userId, refId) {
    return this.userFeed
      .query()
      .from('user_feed')
      .where('user_feed.refId', refId)
      .where('user_feed.refType', 'post')
      .where('user_feed.userId', userId)
      .whereNot('user_feed.isDeleted', true)
      .join('post', 'post._id', 'user_feed.refId')
      .join('user', 'user._id', 'post.userId');
    // .where('post.deletedAt', null);
  }

  async getByPostId(ctx: RequestContext, targetUserId: string, postId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const post = await this._feedQuery2(targetUserId, postId)
      .select(
        'post.*',
        'user.username',
        'user.profileImage',
        'user.displayedName',
        'user_feed.createdAt as feedCreatedAt',
        'user_feed._id as feedId',
        'user_feed.isRead as feedIsRead',
        'user_feed.info as feedInfo',
      )
      .first();

    if (!post) throw new Error('Post not found :' + postId);

    if (post?.deletedAt) return {_id: postId, deletedAt: post?.deletedAt};

    const comments = await this.commentsRepo
      .query()
      .from('comment')
      .where('comment.refType', 'post')
      .where('comment.refId', '=', postId)
      .where('deletedAt', null)

      .join('user', 'user._id', 'comment.userId')
      .select('comment.*', 'user.username', 'user.profileImage', 'user.displayedName')
      .orderBy('createdAt', 'asc');

    const reactions = await this.reactionsRepo
      .query()
      .from('reaction')
      .where('reaction.refType', 'post')
      .where('reaction.refId', '=', postId)
      .join('user', 'user._id', 'reaction.userId')
      .select('reaction.*', 'user.username', 'user.profileImage', 'user.displayedName')
      .orderBy('createdAt', 'asc');

    post.sharedWithUsers = (await this.usersRepo.findWhereIdIn(post.sharedWith)).map((v) =>
      filterToFields(['_id', 'profileImage', 'username', 'displayedName'], v),
    );

    return {
      _id: post.feedId,
      refType: post.refType,
      feedEntry: {
        _id: post.feedId,
        isRead: post.feedIsRead,
        feedInfo: post.feedInfo,
        createdAt: post.feedCreatedAt,
      },
      data: {...post, comments: comments, reactions},
    };
  }

  // ROUTE-METHOD
  async countUnreadByUserId(ctx: RequestContext) {
    const count = Number(
      (await this._feedQuery(ctx.currentUserId).whereNot('user_feed.isRead', true).count().first()).count,
    );

    return count;
  }

  async removeById(ctx: RequestContext, id: string) {
    const feed = await this.userFeed.findById(id);
    await ctx.verifySelfOrAdminOverUser(feed.userId);

    return await this.userFeed.updateWithId(id, {isDeleted: true});
  }

  async removeByPostId(ctx: RequestContext, targetUserId: string, id: string) {
    await ctx.verifySelfOrAdmin(targetUserId);
    const feed = await this.userFeed.findMany({
      userId: targetUserId,
      refType: 'post',
      refId: id,
    });

    if (feed.length > 0) {
      await this.userFeed.updateWithId(feed[0]._id, {isDeleted: true});
    } else {
      throw new Error(`Post with id ${id} not found in user feed. Please check the id and try again.`);
    }
  }

  // ROUTE-METHOD
  // When ids are provided, only those entries are updated. When ids is empty/omitted,
  // all of the user's unread entries are marked (used by "Mark all as read").
  async updateReadStatusForMultipleEntries(ctx: RequestContext, ids: string[], isRead: boolean) {
    const query = this.userFeed.query().where('userId', ctx.currentUserId);

    if (Array.isArray(ids) && ids.length > 0) {
      query.whereIn('user_feed._id', ids);
    } else if (isRead) {
      // Only skip already-read rows for the mark-all-read case.
      query.whereNot('isRead', true);
    }

    await query.update({isRead: isRead});
  }

  // ROUTE-METHOD
  async updateReadStatus(ctx: RequestContext, id: string, isRead: boolean, commentIds: Array<string>) {
    const feed = await this.userFeed.findMany({
      userId: ctx.currentUserId,
      refType: 'post',
      refId: id,
    });

    if (feed.length > 0) {
      const feedItem = feed[0];
      const origUnReadCommentIds = feedItem.info?.unReadCommentIds || [];
      const unReadCommentIds: Array<string> = [];

      if (!isRead) {
        unReadCommentIds.push(...origUnReadCommentIds);
        unReadCommentIds.push(...commentIds);
      } else {
        for (const commentId of origUnReadCommentIds) {
          if (!commentIds.includes(commentId)) {
            unReadCommentIds.push(commentId);
          }
        }
      }

      await this.userFeed.updateWithId(feedItem._id, {
        isRead,
        info: {...feedItem.info, unReadCommentIds: unReadCommentIds},
      });
    } else {
      throw new Error(`Post with id ${id} not found in user feed. Please check the id and try again.`);
    }
  }

  async add(ctx: RequestContext, targetUserId: string, refType: string, refId: string, info: any = null) {
    const feedId = 'feed_' + uuidv4();

    const currentTimeSt = new Date();

    const feedEntry = {
      _id: feedId,
      userId: targetUserId,
      refType: refType,
      refId: refId,
      createdAt: currentTimeSt,
      updatedAt: currentTimeSt,
      info: info,
    };

    return await this.userFeed.create(feedEntry);
  }
}

export default UserFeedService;
