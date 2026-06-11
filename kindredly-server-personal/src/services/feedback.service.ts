import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {PostRepo} from '@/db/post.repo';
import {ReactionRepo} from '@/db/reaction.repo';
import {KEY_DIL} from '@/templates/email.templates';
import NotificationService from './notification.service';
import {RequestContext} from '../base/request_context';
import {container} from '@/inversify.config';
import type {SharedItemReactionView} from 'tset-sharedlib/shared.types';

enum FeedbackRefType {
  POST = 'post',
}

interface Reaction {
  _id: string;
  refId: string;
  refType: string;
  userId: string;
  reaction: string;
  createdAt: Date;
  readAt?: Date;
}

class FeedbackService {
  public itemFeedbackRepo = new ItemFeedbackRepo();
  public reactionRepo = new ReactionRepo();
  private posts = new PostRepo();
  private notificationsService = container.resolve(NotificationService);

  // Feedback id
  feedbackId(userId: string, itemId: string): string {
    return `${userId}${KEY_DIL}${itemId}`;
  }

  // ROUTE-METHOD
  async listReactionsForRef(ctx: RequestContext, refId: string, refType: FeedbackRefType): Promise<any[]> {
    if (refType == FeedbackRefType.POST) {
      if (!(await this._hasPostAccess(ctx, refId))) {
        throw new Error('You do not have access to react to this post');
      }
    } else {
      throw new Error('Invalid refType');
    }

    const post = await this.posts.findById(refId);
    const canSeeReadReceipts = !!post?.userId && post.userId === ctx.currentUserId;

    const reactions = await this.reactionRepo
      .query()
      .from('reaction')
      .where('reaction.refType', refType)
      .where('reaction.refId', '=', refId)
      .join('user', 'user._id', 'reaction.userId')
      .select('reaction.*', 'user.username', 'user.profileImage', 'user.displayedName')
      .orderBy('createdAt', 'asc');

    if (!canSeeReadReceipts) {
      // Read receipts are author-only. A non-author may still list emoji reactions,
      // but must not learn who has read the post.
      return (reactions || []).map((r: any) => ({
        ...r,
        readAt: null,
      }));
    }

    return reactions;
  }

  async _hasPostAccess(ctx: RequestContext, postId: string): Promise<boolean> {
    let post = await this.posts.findById(postId);

    if (post.userId != ctx.currentUserId && !post.sharedWith.includes(ctx.currentUserId)) {
      return false;
    }
    return true;
  }

  // ROUTE-METHOD
  async saveReaction(ctx: RequestContext, refId: string, refType: FeedbackRefType, reaction: string): Promise<string> {
    let userId = ctx.currentUserId;
    const id = `${refId}${KEY_DIL}${userId}`;

    if (refType == FeedbackRefType.POST) {
      if (!(await this._hasPostAccess(ctx, refId))) {
        throw new Error('You do not have access to react to this post');
      }
    } else {
      throw new Error('Invalid refType');
    }

    if (!reaction) {
      await this.reactionRepo.deleteWithId(id);
      return id;
    }

    // get current reaction
    const lastReaction = await this.reactionRepo.findById(id);

    const reactionData: Reaction = {
      _id: id,
      refId,
      refType,
      userId,
      reaction,
      createdAt: new Date(),
    };
    await this.reactionRepo.create(reactionData);

    let dontNotify = false;
    if (!!lastReaction) {
      // if last reaction was in last few minutes
      // dont notify

      try {
        let timeDiff = new Date().getTime() - lastReaction.createdAt.getTime();

        if (lastReaction.reaction == reaction || timeDiff < 1000 * 60 * 5) {
          // same reaction, no need to notify
          dontNotify = true;
        }
      } catch (err) {
        console.log(err);
      }
    }

    // TODO: reactions for other stuff later
    if (refType == FeedbackRefType.POST && !dontNotify) {
      let currentUser = await ctx.getCurrentUser();

      // NOTIFY POSTER
      // if poster is not self, send notifications
      const userIdUpdateList = [];
      let post = await this.posts.findById(refId);
      if (post.userId !== ctx.currentUserId) userIdUpdateList.push(post.userId);
      else {
        // no notifications for self
        return id;
      }

      await this.notificationsService.sendReactionNotifications(currentUser, post, userIdUpdateList, ctx);
    }
    return id;
  }

  // ROUTE-METHOD
  async markPostReadReceipt(
    ctx: RequestContext,
    postId: string,
    isRead?: boolean,
  ): Promise<{postId: string; readAt: Date | null}> {
    if (!(await this._hasPostAccess(ctx, postId))) {
      throw new Error('You do not have access to view this post');
    }

    // Never create a read receipt for the post author.
    const post = await this.posts.findById(postId);
    if (post?.userId && post.userId === ctx.currentUserId) {
      return {postId, readAt: null};
    }

    const userId = ctx.currentUserId;
    const id = `${postId}${KEY_DIL}${userId}`;

    // Read receipts are write-once. Marking a post "unread" is a personal feed state
    // and must not revoke a receipt.
    if (isRead === false) {
      const row = (await this.reactionRepo.query().from('reaction').where({_id: id}).select(['readAt']).first()) as any;

      return {postId, readAt: (row?.readAt as Date) || null};
    }

    // Ensure row exists; do not overwrite other columns.
    await this.reactionRepo
      .query()
      .insert({
        _id: id,
        refId: postId,
        refType: FeedbackRefType.POST,
        userId,
        createdAt: new Date(),
      })
      .onConflict('_id')
      .ignore();

    const updated = (await this.reactionRepo
      .query()
      .where({_id: id})
      .update({
        readAt: this.reactionRepo.knex.raw('COALESCE("readAt", NOW())'),
      })
      .returning(['readAt'])) as any[];

    const readAt = (updated?.[0]?.readAt as Date) || null;
    return {postId, readAt};
  }

  // ROUTE-METHOD
  async listPostReadReceipts(
    ctx: RequestContext,
    postId: string,
  ): Promise<{
    readers: Array<{
      userId: string;
      displayedName: string;
      username: string;
      profileImage?: any;
      readAt: Date;
    }>;
    count: number;
  }> {
    if (!(await this._hasPostAccess(ctx, postId))) {
      throw new Error('You do not have access to view this post');
    }

    const post = await this.posts.findById(postId);

    // Read receipts are visible to the post author only.
    if (!post?.userId || post.userId !== ctx.currentUserId) {
      throw new Error('Only the post author can view read receipts');
    }

    const rows = (await this.reactionRepo
      .query()
      .from('reaction')
      .where('reaction.refType', FeedbackRefType.POST)
      .where('reaction.refId', '=', postId)
      .whereNotNull('reaction.readAt')
      .whereNot('reaction.userId', post.userId)
      .join('user', 'user._id', 'reaction.userId')
      .select('reaction.userId', 'reaction.readAt', 'user.username', 'user.profileImage', 'user.displayedName')
      .orderBy('reaction.readAt', 'asc')) as any[];

    const readers = rows.map((r) => ({
      userId: r.userId,
      displayedName: r.displayedName,
      username: r.username,
      profileImage: r.profileImage,
      readAt: r.readAt,
    }));

    return {readers, count: readers.length};
  }

  async _getItemFeedback(userId: string, itemId: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(this.feedbackId(userId, itemId));
  }

  async _getItemFeedbackForUser(ctx: RequestContext, itemId: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(this.feedbackId(ctx.currentUserId, itemId));
  }

  async _getItemFeedbackById(id: string): Promise<any> {
    return await this.itemFeedbackRepo.findById(id);
  }

  async _getItemFeedbackByIds(userId: string, itemIds: string[]): Promise<any[]> {
    const ids = itemIds.map((itemId) => this.feedbackId(userId, itemId));
    return await this.itemFeedbackRepo.findIdWhereIn(ids);
  }

  async listItemReactions(itemId: string): Promise<SharedItemReactionView[]> {
    const rows = await this.itemFeedbackRepo
      .query()
      .from('item_feedback as f')
      .join('user as u', 'u._id', 'f.userId')
      .where('f.itemId', itemId)
      .whereNotNull('f.reaction')
      .where((q) => {
        q.whereNull('u.deleted').orWhere('u.deleted', false);
      })
      .where((q) => {
        q.whereNull('u.disabled').orWhere('u.disabled', false);
      })
      .select([
        'f.userId as userId',
        'f.reaction as reaction',
        'f.reactionDate as reactionDate',
        'u.username as username',
        'u.displayedName as displayedName',
        'u.profileImage as profileImage',
      ])
      .orderBy('f.reactionDate', 'desc');

    return (rows || []).map((row: any) => ({
      userId: row.userId,
      username: row.username,
      displayedName: row.displayedName || undefined,
      profileImage: row.profileImage || undefined,
      reaction: row.reaction,
      reactionDate: row.reactionDate ? new Date(row.reactionDate).toISOString() : undefined,
    }));
  }

  async _updateItemFeedback(userId: string, itemId: string, feedback: any): Promise<string> {
    const id = this.feedbackId(userId, itemId);
    const origfeedback = await this._getItemFeedback(userId, itemId);
    const updatedFeedback = {
      ...origfeedback,
      ...feedback,
      itemId,
      _id: id,
      userId: userId,
      updatedAt: new Date(),
      createdAt: origfeedback?.createdAt || new Date(),
    };

    await this.itemFeedbackRepo.create(updatedFeedback);

    return id;
  }
}

export default FeedbackService;
