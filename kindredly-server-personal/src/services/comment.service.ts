import { RequestContext } from '@/base/request_context';
import { config } from '@/config';
import { v4 as uuidv4 } from 'uuid';

import NotificationService from './notification.service';
import { CommentRepo } from '@/db/comment.repo';
import { PostRepo } from '@/db/post.repo';
import { DynObj } from '@/types';
import { UserFeedRepo } from '@/db/user_feed.repo';
import PermissionService from './permission.service';
import { container } from '@/inversify.config';

enum CommentRefType {
  ITEM = 'item',
  POST = 'post',
}

class CommentService {
  private notificationsService =container.resolve(NotificationService);
  private posts = new PostRepo();
  private feeds = new UserFeedRepo();
  private comments = new CommentRepo();
  private permissionService = new PermissionService();

  // ROUTE-METHOD
  async listForRef(ctx: RequestContext, targetUserId: string, refId: string, refType: CommentRefType, pageInfo: DynObj = {}) {
    await ctx.verifyInNetwork([targetUserId]);
    const { currentPage = 0, perPage = 100, includeTotalRows = false } = pageInfo;
    const query = { refId, refType };


    await this.validateViewAccess(ctx, refType, refId);

    const records = await this.comments
      .findMany(query)
      .join('user', 'user._id', 'comment.userId')
      .select('comment.*', 'user.profileImage', 'user.username')
      .where('deletedAt', null)
      .limit(perPage)
      .offset(currentPage)
      .orderBy('createdAt', 'asc');

    if (!includeTotalRows) return { records, count: null };
    const count = await this.comments.countRows(query);
    return { records, count };
  }

  async validateViewAccess(ctx: RequestContext, refType: CommentRefType, refId: string) {
    if (refType == CommentRefType.ITEM) {
      let hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, refId);
      if (!hasPermission) {
        throw new Error("You don't have permission to access this item");
      }
    }
    else if (refType == CommentRefType.POST) {

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
    return await this.comments.updateWithId(id, { deletedAt: new Date() });
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
      let permissions = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, refId, false);


      await this.comments.create(info);

      if (!permissions || permissions.length == 0) return;
      this.notificationsService.notifyItemUsersOfComment(currentUser, refId, commentId, permissions, ctx);
    }

    else if (refType == CommentRefType.POST) {
      let post = await this.posts.findById(refId);

      post.sharedWith = post.sharedWith || [];
      if (post.userId != ctx.currentUserId && !post.sharedWith.includes(ctx.currentUserId)) {
        throw new Error('You do not have permission to comment on this post');
      }
      await this.comments.create(info);


      const feedList = await this.feeds.findMany({ refId });
      for (const feed of feedList.filter((v) => v.userId !== ctx.currentUserId)) {
        const unReadCommentIds = feed?.info?.unReadCommentIds || [];
        unReadCommentIds.push(commentId);
        let info = {
          ...feed.info,
          unReadCommentIds,
        };
        await this.feeds.updateWithId(feed._id, { isRead: false, info });
      }

      // NOTIFY POSTER
      // if commentor is not self, send notifications
      const userIdUpdateList = [];
      if (post.userId !== ctx.currentUserId) userIdUpdateList.push(post.userId);

      //TODO: allow users to unwatch posts
      if (post.sharedWith && post.sharedWith.length > 0) {
        post.sharedWith.forEach((userId) => {
          if (userId && userId !== ctx.currentUserId
            && userId !== post.userId) userIdUpdateList.push(userId);
        });
      }

      await this.notificationsService.notifyCommentPosterAndWatchers(currentUser, post, commentId, userIdUpdateList, ctx);
    }
  }

}

export default CommentService;
