import {PostRepo} from '@/db/post.repo';
import {UserRepo} from '@/db/user.repo';
import {UserFeedRepo} from '@/db/user_feed.repo';
import {RequestContext} from '@/base/request_context';
import {DynObj} from '@/types';
import {v4 as uuidv4} from 'uuid';

import PermissionService from './permission.service';
import UserFeedService from './user_feed.service';

import NotificationService from './notification.service';
import {config} from '@/config';

import {PostData} from '@/base/post_interfaces';
import UserFileService from './user_file.service';
import { NotificationType } from '@/typing/enum_strings';
import { PermissionType, UserType } from 'tset-sharedlib/shared.types';
import { container } from '@/inversify.config';

class PostService {
  private posts = new PostRepo();
  private users = new UserRepo();
  private userFeedService = new UserFeedService();
  private permissionService = new PermissionService();
  private userFeed = new UserFeedRepo();
  private notificationService =  container.resolve(NotificationService);

  private userFileService = container.resolve(UserFileService);

  // ROUTE-METHOD
  async listByUserId(ctx: RequestContext, targetUserId: string, pageInfo: DynObj) {
    await ctx.verifyAdminPermissions(targetUserId);
    const {currentPage = 0, perPage = 100, includeTotalRows = false} = pageInfo;
    const records = await this.posts
      .findMany({userId: targetUserId})
      .where('deletedAt', null)
      .limit(perPage)
      .offset(currentPage)
      .orderBy('createdAt', 'desc');

    if (!includeTotalRows) return {records, count: null};
    const count = await this.posts.countRows({userId: targetUserId});
    return {records, count};
  }

  async removeById(ctx: RequestContext, id: string) {
    return await this.posts.updateWithId(id, {deletedAt: new Date()});
  }


  // ROUTE-METHOD
  async createPost(
    ctx: RequestContext,
    postType: string,
    data: PostData,
    attachedItems: any[],
    sharedWith: string[],
    encInfo: DynObj = null,
  ) {

    await ctx.verifyInNetwork(sharedWith);


    const postId = 'post_' + uuidv4();

    const currentTimeSt = new Date();

    let encrypted = false;
    if (encInfo && !encInfo?.decrypt) {
      encrypted = true;
    } else {
      encInfo = null;
    }


    //TODO: do following in transaction

    // save attachments first
    await this._saveAttachmentsAndModifyAttachedItemsObject(attachedItems, ctx, postId, encInfo);

    const info = {
      _id: postId,
      userId: ctx.currentUserId,
      postType: postType,
      data: data,
      attachedItems: attachedItems,
      sharedWith: sharedWith,
      createdAt: currentTimeSt,
      encInfo: encInfo,
      encrypted,
    };

    //Create after because we update attachedItems
     await this.posts.create(info);


    //verify sharedWith
    const currentUser = await ctx.getCurrentUser();

    const message = `${currentUser.username} shared a post with you. <a href="/kindredapp/#/p/${postId}">View post</a>.`;
    const emailMessage = `${currentUser.username} shared a post with you. <a href="${config.serverHostname}/kindredapp/#/p/${postId}">View post</a>.`;
    const notificationData = {
      title: `New Post share by ${currentUser.username}`,
      shortMessage: `${currentUser.username} shared a post with you.`,
      message: message,
      emailMessage: emailMessage,
      refInfo: {
        postId: postId,
        postUsername: currentUser.username,
      },
    };

    //Add to user feeds and create list of users to share attachments with
    const attachmentSharedUserIds = [];

    if (sharedWith) {
      for (const userId of sharedWith) {

        const user = await this.users.findById(userId);

        if (user) {
          await this.userFeedService.add(ctx, userId, 'post', postId);

          try {
            if (userId != ctx.currentUserId) {
              ctx.cacheUser(user);
              this.notificationService
                .addUserNotification(ctx, 
                  NotificationType.NEW_POST, 
                  ctx.currentUserId, user.accountId, userId, 
                  notificationData, true)
                .catch((e) => {
                  console.log('Error sending friend request notification', e);
                });
            }
          } catch (err) {
            console.log(err);
          }

          if (((await ctx.isAdmin()) || user.type === UserType.admin) && user.accountId == ctx.accountId) {
            if (userId != ctx.currentUserId)
              attachmentSharedUserIds.push(userId);
          }
        }
      }
    }

    if (attachedItems) {
      
      for (const attachment of attachedItems || []) {
        if (attachment.type === 'libItem') {
          await this.permissionService.shareItemWithUsers(
            ctx,
            attachment.itemId,
            attachmentSharedUserIds,
            PermissionType.editor,
            true,
            false //viewer if restricted
          );
        }
      }
    }

    return postId;
  }
  

  private async _saveAttachmentsAndModifyAttachedItemsObject(attachedItems: any[], ctx: RequestContext, postId: string, encInfo: DynObj) {
    
    if (attachedItems.length > 6) {
      throw new Error('Too many attachments, max = 6');
    }

    if (attachedItems && attachedItems.length > 0) {

      for (const attachedItem of attachedItems) {
        if (attachedItem.type == 'imageFile') {
          const adata = attachedItem.data;
          const imageType = adata.imageType || 'jpeg';
          const fileId = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: imageType,
            filename: 'image_' + attachedItem.id,
            encInfo: encInfo,
            previews: [{ data: adata.imagePreview, id: '0', type: 'jpeg' }],
            fileData: adata.fileData || adata.image,
          });

          //replace data with fileInfo
          attachedItem.data = { fileId, imageType, hasPreview: true };
        }
        else if (attachedItem.type == 'videoFile') {
          const adata = attachedItem.data;
          const imageType = adata.imageType || 'jpeg';
          const { fileData, fileType } = attachedItem.data;
          const fileId = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: fileType,
            filename: 'video_' + attachedItem.id,
            encInfo: encInfo,
            previews: [{ data: adata.imagePreview, id: '0', type: 'jpeg' }],
            fileData: fileData,
          });

          //replace data with fileInfo
          attachedItem.data = { fileId, fileType };

        }
      }

    }
  }


  // ROUTE-METHOD
  async updateSharedWith(ctx: RequestContext, postId: string, sharedWith: string[]) {
    const post = await this.posts.findById(postId);
    await ctx.verifySelfOrAdminOverUser(post.userId);

    const originalSharedWith = post.sharedWith;

    const noLongerSharedWith = originalSharedWith.filter((v) => !sharedWith.includes(v));
    const newlySharedWith = sharedWith.filter((v) => !originalSharedWith.includes(v));

    await ctx.verifyInNetwork(newlySharedWith);


    //Add to user feeds and create list of users to share attachments with
    await this.posts.updateWithId(postId, {sharedWith: sharedWith});
    const attachmentSharedUserIds = [];
    for (const userId of newlySharedWith) {
      const user = await this.users.findById(userId);
      if (user) {
        await this.userFeedService.add(ctx, userId, 'post', postId);
        if (((await ctx.isAdmin()) || user.type === UserType.admin) && user.accountId == ctx.accountId) {
          attachmentSharedUserIds.push(userId);
        }
      }
    }
    for (const userId of noLongerSharedWith) {
      const feed = await this.userFeed.findMany({userId, refType: 'post', refId: postId});
      if (feed.length > 0) {
        await this.userFeed.updateWithId(feed[0]._id, {isDeleted: true});
      }
    }

    for (const attachment of post.data.attachedItems || []) {
      if (attachment.type === 'libItem') {
        await this.permissionService.shareItemWithUsers(
          ctx,
          attachment.itemId,
          attachmentSharedUserIds,
          PermissionType.editor,
          true,
        );
      }
    }

    return true;
  }

  // ROUTE-METHOD
  async deletePost(ctx: RequestContext, id: string) {
    const post = await this.posts.findById(id);
    await ctx.verifySelfOrAdminOverUser(post.userId);

    return await this.posts.updateWithId(id, {deletedAt: new Date()});
  }

}

export default PostService;
