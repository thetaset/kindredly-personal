import {RequestContext} from '@/base/request_context';
import {config} from '@/config';
import {v4 as uuidv4} from 'uuid';

import NotificationService from './notification.service';
import {CommentRepo} from '@/db/comment.repo';
import {PostRepo} from '@/db/post.repo';
import {DynObj} from '@/types';
import {UserFeedRepo} from '@/db/user_feed.repo';
import PermissionService from './permission.service';
import {container} from '@/inversify.config';
import {ItemRepo} from '@/db/item.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import {ItemTypeEnum} from 'tset-sharedlib/shared.types';

enum CommentRefType {
  ITEM = 'item',
  POST = 'post',
}

class CommentService {
  private notificationsService = container.resolve(NotificationService);
  private posts = new PostRepo();
  private feeds = new UserFeedRepo();
  private comments = new CommentRepo();
  private permissionService = new PermissionService();
  private items = new ItemRepo();
  private itemRelations = new ItemRelationRepo();

  // ROUTE-METHOD
  async listForRef(
    ctx: RequestContext,
    targetUserId: string,
    refId: string,
    refType: CommentRefType,
    pageInfo: DynObj = {},
  ) {
    await ctx.verifyInNetwork([targetUserId]);
    const {currentPage = 0, perPage = 100, includeTotalRows = false} = pageInfo;
    const query = {refId, refType};

    await this.validateViewAccess(ctx, refType, refId);

    // Only show comments authored by people in your family or friends.
    if (!ctx.inNetworkUserSet) {
      await ctx.loadInNetwork();
    }
    const allowedAuthorIds = Array.from(ctx.inNetworkUserSet || []);

    const records = await this.comments
      .findMany(query)
      .join('user', 'user._id', 'comment.userId')
      .select('comment.*', 'user.profileImage', 'user.username')
      .whereIn('comment.userId', allowedAuthorIds)
      .where('deletedAt', null)
      .limit(perPage)
      .offset(currentPage)
      .orderBy('createdAt', 'asc');

    if (!includeTotalRows) return {records, count: null};
    const count = await this.comments.countRows(query);
    return {records, count};
  }

  async validateViewAccess(ctx: RequestContext, refType: CommentRefType, refId: string) {
    if (refType == CommentRefType.ITEM) {
      // Allow comment access if the viewer can view the item.
      // This should mirror ItemService.getItemInfoById permission behavior.

      if (await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId)) return;
      if (await ctx.isAdmin()) return;

      const item = await ctx.getItemById(refId);
      if (!item) {
        throw new Error("You don't have permission to access this item");
      }

      // If the ref is a collection, visibility rules apply directly.
      const isCollection = item.type === ItemTypeEnum.collection;
      if (isCollection) {
        if (item.accountId === ctx.accountId && (item.visibility === 'shared' || item.visibility === 'network')) {
          return;
        }
        if (item.visibility === 'network' && item.userId && (await ctx.isInNetwork(item.userId))) {
          return;
        }
      }

      // If the item is contained under any collection the viewer can see (shared/network/direct), allow.
      const maxDepth = 6;
      const maxNodes = 75;
      const visited = new Set<string>();

      const initialParents = await this.itemRelations.findMany({itemId: refId});
      let queue: Array<{colId: string; depth: number}> = (initialParents || [])
        .map((r) => r?.collectionId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map((colId) => ({colId, depth: 0}));

      while (queue.length > 0 && visited.size < maxNodes) {
        const next = queue.shift();
        if (!next) break;
        const {colId, depth} = next;
        if (!colId || visited.has(colId)) continue;
        visited.add(colId);

        if (await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, colId)) return;

        const col = await ctx.getItemById(colId);
        if (col) {
          if (col.accountId === ctx.accountId && (col.visibility === 'shared' || col.visibility === 'network')) {
            return;
          }

          if (col.visibility === 'network' && col.userId && (await ctx.isInNetwork(col.userId))) {
            return;
          }
        }

        if (depth >= maxDepth) continue;

        const parents = await this.itemRelations.findMany({itemId: colId});
        for (const r of parents || []) {
          const pid = r?.collectionId;
          if (typeof pid === 'string' && pid.length > 0 && !visited.has(pid)) {
            queue.push({colId: pid, depth: depth + 1});
          }
        }
      }

      throw new Error("You don't have permission to access this item");
    } else if (refType == CommentRefType.POST) {
      let post = await this.posts.findById(refId);
      let hasPermission = false;

      // check
      if (post.userId != ctx.currentUserId && !post.sharedWith.includes(ctx.currentUserId)) {
        if (ctx.isAdmin()) {
          let managedUserIds = new Set(await ctx.getManagedUserIds());

          let usersToCheck = [post.userId, ...post.sharedWith];
          for (let userId of usersToCheck) {
            if (managedUserIds.has(userId)) {
              hasPermission = true;
              break;
            }
          }
        }

        if (!hasPermission) {
          throw new Error('You do not have permission to view comments on this post');
        }
      }
    }
  }

  // ROUTE-METHOD
  async removeById(ctx: RequestContext, id: string) {
    const comment = await this.comments.findById(id);

    await ctx.verifySelfOrAdminOverUser(comment.userId);
    return await this.comments.updateWithId(id, {deletedAt: new Date()});
  }

  // ROUTE-METHOD
  async create(
    ctx: RequestContext,
    refId: string,
    refType: CommentRefType,
    parentId: string,
    data: DynObj,
    encInfo?: DynObj,
  ) {
    const commentId = 'cmt_' + uuidv4();

    const encrypted = encInfo ? true : false;

    const info = {
      _id: commentId,
      userId: ctx.currentUserId,
      refType,
      refId,
      parentId,
      data,
      encrypted,
      encInfo,
    };
    const currentUser = await ctx.getCurrentUser();

    await this.validateViewAccess(ctx, refType, refId);

    if (refType == CommentRefType.ITEM) {
      // Create is allowed for anyone who can view the item (including via network-visible collections).
      // When notifying, only notify users in the author's network (family + confirmed friends).
      // Also avoid PermissionService's admin-only access-check exception by skipping it here.
      let permissions = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, refId, true);

      if (!ctx.inNetworkUserSet) {
        await ctx.loadInNetwork();
      }
      const allowedNotifySet = ctx.inNetworkUserSet || new Set<string>();
      permissions = (permissions || []).filter((uid) => allowedNotifySet.has(uid));

      await this.comments.create(info);

      if (!permissions || permissions.length == 0) return;
      this.notificationsService.notifyItemUsersOfComment(currentUser, refId, commentId, permissions, ctx);
    } else if (refType == CommentRefType.POST) {
      let post = await this.posts.findById(refId);

      post.sharedWith = post.sharedWith || [];
      if (post.userId != ctx.currentUserId && !post.sharedWith.includes(ctx.currentUserId)) {
        throw new Error('You do not have permission to comment on this post');
      }
      await this.comments.create(info);

      const feedList = await this.feeds.findMany({refId});
      for (const feed of feedList.filter((v) => v.userId !== ctx.currentUserId)) {
        const unReadCommentIds = feed?.info?.unReadCommentIds || [];
        unReadCommentIds.push(commentId);
        let info = {
          ...feed.info,
          unReadCommentIds,
        };
        await this.feeds.updateWithId(feed._id, {isRead: false, info});
      }

      // NOTIFY POSTER
      // if commentor is not self, send notifications
      const userIdUpdateList = [];
      if (post.userId !== ctx.currentUserId) userIdUpdateList.push(post.userId);

      //TODO: allow users to unwatch posts
      if (post.sharedWith && post.sharedWith.length > 0) {
        post.sharedWith.forEach((userId) => {
          if (userId && userId !== ctx.currentUserId && userId !== post.userId) userIdUpdateList.push(userId);
        });
      }

      await this.notificationsService.notifyCommentPosterAndWatchers(
        currentUser,
        post,
        commentId,
        userIdUpdateList,
        ctx,
      );
    }
  }
}

export default CommentService;
