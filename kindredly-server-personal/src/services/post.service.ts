import {PostRepo} from '@/db/post.repo';
import {UserRepo} from '@/db/user.repo';
import {UserFeedRepo} from '@/db/user_feed.repo';
import {ItemRepo} from '@/db/item.repo';
import {RequestContext} from '@/base/request_context';
import {DynObj} from '@/types';
import {v4 as uuidv4} from 'uuid';

import PermissionService from './permission.service';
import UserFeedService from './user_feed.service';

import NotificationService from './notification.service';
import ItemService from './item.service';
import {config} from '@/config';

import {PostData} from '@/base/post_interfaces';
import UserFileService from './user_file.service';
import {NotificationType} from '@/typing/enum_strings';
import {ItemTypeEnum, PermissionType, UserType, type EncInfo} from 'tset-sharedlib/shared.types';
import {container} from '@/inversify.config';
import {
  CreatePostRequest,
  MAX_POST_ATTACHMENTS,
  SaveItemRequest,
  SavePostAttachmentToLibraryRequest,
  SavePostAttachmentToLibraryResponse,
} from 'tset-sharedlib/api';
import {urlToKey} from 'tset-sharedlib/text.utils';

class PostService {
  private posts = new PostRepo();
  private users = new UserRepo();
  private userFeedService = new UserFeedService();
  private permissionService = new PermissionService();
  private userFeed = new UserFeedRepo();
  private items = new ItemRepo();
  private notificationService = container.resolve(NotificationService);
  private itemService = new ItemService();

  private userFileService = container.resolve(UserFileService);

  private getPostAttachedItems(post: any): any[] {
    const topLevelAttachedItems = Array.isArray(post?.attachedItems) ? post.attachedItems : [];
    if (topLevelAttachedItems.length > 0) {
      return topLevelAttachedItems;
    }

    return Array.isArray(post?.data?.attachedItems) ? post.data.attachedItems : [];
  }

  private resolveSaveAttachmentBundleItem(
    post: any,
    request: SavePostAttachmentToLibraryRequest,
    bundleAttachment: any,
  ): Record<string, any> | null {
    const storedBundleItem = bundleAttachment?.data?.item;
    if (storedBundleItem && typeof storedBundleItem === 'object') {
      return storedBundleItem;
    }

    const bundleSource = request.bundleSource;
    if (!bundleSource || typeof bundleSource !== 'object') {
      return null;
    }

    return bundleSource as Record<string, any>;
  }

  private buildBundleAttachmentSaveRequest(
    bundleItem: Record<string, any>,
    requestedDetails: SaveItemRequest['details'] | null | undefined = null,
  ): SaveItemRequest {
    const requested = requestedDetails || {};

    return {
      itemId: undefined,
      isNew: true,
      details: {
        ...requested,
        url: bundleItem.url || null,
        key: bundleItem.url ? urlToKey(bundleItem.url) : null,
        name: requested.name ?? bundleItem.name ?? null,
        description: requested.description ?? bundleItem.description ?? null,
        comment: requested.comment ?? bundleItem.comment ?? null,
        tags: Array.isArray(requested.tags) ? requested.tags : bundleItem.tags || [],
        type: bundleItem.type || requested.type || 'link',
        subType: bundleItem.subType || requested.subType || null,
        patterns: Array.isArray(bundleItem.patterns) ? bundleItem.patterns : null,
        imageFilename: bundleItem.imageFilename || null,
        useCriteria: requested.useCriteria ?? bundleItem.useCriteria,
        categories: Array.isArray(requested.categories)
          ? requested.categories
          : Array.isArray(bundleItem.categories)
            ? bundleItem.categories
            : [],
        publishId: bundleItem.publishId || null,
        info: bundleItem.info || requested.info || {},
        meta: bundleItem.meta || requested.meta || null,
        encInfo: null,
      } as SaveItemRequest['details'],
      quickShareUserIds: [],
      accessRequestId: undefined,
      targetUserId: undefined,
      tempAuthToken: undefined,
    };
  }

  private async getAttachedCollectionItemIds(attachedItems: any[]) {
    const candidateItemIds = Array.from(
      new Set(
        (attachedItems || [])
          .filter((attachment) => attachment?.type === 'libItem' && !!attachment?.itemId)
          .map((attachment) => attachment.itemId),
      ),
    );

    if (candidateItemIds.length === 0) {
      return new Set<string>();
    }

    const attachedLibraryItems = await this.items.query().whereIn('_id', candidateItemIds).select('_id', 'type');
    return new Set(
      (attachedLibraryItems || [])
        .filter((item) => item?.type === ItemTypeEnum.collection)
        .map((item) => item._id),
    );
  }

  private getAttachedShareSourceItemId(attachment: any): string {
    const rawId =
      attachment?.itemId ??
      attachment?.data?._id ??
      attachment?.data?.id ??
      attachment?.data?.item?._id ??
      attachment?.data?.item?.id;

    return rawId != null ? String(rawId).trim() : '';
  }

  private async assertCanShareAttachedLibraryItems(
    ctx: RequestContext,
    attachedItems: any[],
    recipientUserIds: string[],
  ) {
    if (!attachedItems?.length || !recipientUserIds?.length) {
      return;
    }

    const currentUser = await ctx.getCurrentUser();
    const hasRestrictedOutOfLibraryBundle =
      currentUser?.type === UserType.restricted &&
      (attachedItems || []).some(
        (attachment) => attachment?.type === 'libItemBundle' && !this.getAttachedShareSourceItemId(attachment),
      );

    if (hasRestrictedOutOfLibraryBundle) {
      throw new Error('Restricted users can only share content that is already in their library');
    }

    const attachedItemIds = Array.from(
      new Set(
        (attachedItems || [])
          .filter((attachment) => attachment?.type === 'libItem' || attachment?.type === 'libItemBundle')
          .map((attachment) => this.getAttachedShareSourceItemId(attachment))
          .filter((itemId) => !!itemId),
      ),
    );

    for (const itemId of attachedItemIds) {
      const canShare = await this.permissionService._hasSharePermissionDirectOrAsAdmin(ctx, itemId);
      if (!canShare) {
        throw new Error("You don't have permission to share one or more attached library items");
      }
    }
  }

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
  async createPost(ctx: RequestContext, createRequest: CreatePostRequest) {
    let {postType, data, attachedItems, sharedWith} = createRequest;
    let encInfo: EncInfo | null = createRequest.encInfo ?? null;

    await ctx.verifyInNetwork(sharedWith);

    const postId = 'post_' + uuidv4();

    const currentTimeSt = new Date();

    let encrypted = false;
    if (encInfo && !('decrypt' in encInfo && encInfo.decrypt === true)) {
      encrypted = true;
    } else {
      encInfo = null;
    }

    //TODO: do following in transaction

    // save attachments first
    await this._saveAttachmentsAndModifyAttachedItemsObject(attachedItems, ctx, postId, encInfo);

    const recipientUserIds = (sharedWith || []).filter((userId) => !!userId && userId !== ctx.currentUserId);
    await this.assertCanShareAttachedLibraryItems(ctx, attachedItems || [], recipientUserIds);

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

    // Add to user feeds and create lookup(s) for attachment sharing.
    // Note: we intentionally treat cross-account (friend) recipients differently.
    const attachmentSharedUserIds: string[] = [];
    const sharedWithUserMap = new Map<string, {accountId?: string | null; type?: UserType | null}>();

    if (sharedWith) {
      // Batch the recipient lookups instead of one findById per user (N+1).
      const sharedUsers = await this.users.findWhereIdIn(sharedWith);
      const sharedUserById = new Map(sharedUsers.map((u) => [u._id, u]));
      for (const userId of sharedWith) {
        const user = sharedUserById.get(userId);

        if (user) {
          await this.userFeedService.add(ctx, userId, 'post', postId);

          try {
            if (userId != ctx.currentUserId) {
              ctx.cacheUser(user);
              this.notificationService
                .addUserNotification(
                  ctx,
                  NotificationType.NEW_POST,
                  ctx.currentUserId,
                  user.accountId,
                  userId,
                  notificationData,
                  true,
                )
                .catch((e) => {
                  console.log('Error sending friend request notification', e);
                });
            }
          } catch (err) {
            console.log(err);
          }

          if (user.accountId == ctx.accountId) {
            if (userId != ctx.currentUserId) attachmentSharedUserIds.push(userId);
          }

          sharedWithUserMap.set(userId, {accountId: user.accountId, type: user.type});
        }
      }
    }

    const collectionItemIds = await this.getAttachedCollectionItemIds(attachedItems || []);

    const sameAccountRestrictedRecipientUserIds = recipientUserIds.filter((userId) => {
      const user = sharedWithUserMap.get(userId);
      return !!user?.accountId && user.accountId === ctx.accountId && user.type === UserType.restricted;
    });

    const sameAccountNonRestrictedRecipientUserIds = recipientUserIds.filter((userId) => {
      const user = sharedWithUserMap.get(userId);
      return !!user?.accountId && user.accountId === ctx.accountId && user.type !== UserType.restricted;
    });

    if (attachedItems && !encrypted) {
      for (const attachment of attachedItems || []) {
        if (attachment.type === 'libItem' && !collectionItemIds.has(attachment.itemId)) {
          await this.permissionService.shareItemWithUsers(
            ctx,
            attachment.itemId,
            sameAccountNonRestrictedRecipientUserIds,
            PermissionType.editor,
            true,
            false, //viewer if restricted
            true,
            false,
            true,
          );

          if (sameAccountRestrictedRecipientUserIds.length > 0) {
            await this.permissionService.shareItemWithUsers(
              ctx,
              attachment.itemId,
              sameAccountRestrictedRecipientUserIds,
              PermissionType.viewer,
              true,
              true,
              false,
              false,
              true,
            );
          }
        }
      }
    }

    // For encrypted posts, also grant VIEW access to attached items for same-account recipients.
    if (encrypted && sharedWith && sharedWith.length > 0) {
      const recipientUserIds = sharedWith.filter((v) => v && v !== ctx.currentUserId);
      if (recipientUserIds.length > 0) {
        for (const attachment of attachedItems || []) {
          if (attachment.type !== 'libItem' || !attachment.itemId || collectionItemIds.has(attachment.itemId)) continue;

          const sameAccountRecipients = recipientUserIds.filter((uid) => {
            const u = sharedWithUserMap.get(uid);
            return !!u?.accountId && u.accountId === ctx.accountId && u.type !== UserType.restricted;
          });

          try {
            if (sameAccountRecipients.length > 0) {
              await this.permissionService.shareItemWithUsers(
                ctx,
                attachment.itemId,
                sameAccountRecipients,
                PermissionType.viewer,
                true,
                true,
                true,
                false,
                true,
              );
            }
            if (sameAccountRestrictedRecipientUserIds.length > 0) {
              await this.permissionService.shareItemWithUsers(
                ctx,
                attachment.itemId,
                sameAccountRestrictedRecipientUserIds,
                PermissionType.viewer,
                true,
                true,
                false,
                false,
                true,
              );
            }
          } catch (_e) {
            // Best-effort: post creation should still succeed.
          }
        }
      }
    }

    return postId;
  }

  private async _saveAttachmentsAndModifyAttachedItemsObject(
    attachedItems: any[],
    ctx: RequestContext,
    postId: string,
    encInfo: EncInfo | null,
  ) {
    const attachmentList = attachedItems || [];

    if (attachmentList.length > MAX_POST_ATTACHMENTS) {
      throw new Error(`Posts can have up to ${MAX_POST_ATTACHMENTS} attachments.`);
    }

    if (attachmentList.length > 0) {
      for (const attachedItem of attachmentList) {
        if (attachedItem.type == 'imageFile') {
          const adata = attachedItem.data;
          const imageType = adata.imageType || 'jpeg';
          const ref = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: imageType,
            filename: 'image_' + attachedItem.id,
            encInfo,
            previews: [{data: adata.imagePreview, id: '0', type: 'jpeg'}],
            fileData: adata.fileData || adata.image,
          });

          //replace data with fileInfo
          attachedItem.data = {fileId: ref._id, imageType, hasPreview: true};
        } else if (attachedItem.type == 'videoFile') {
          const adata = attachedItem.data;
          const imageType = adata.imageType || 'jpeg';
          const {fileData, fileType} = attachedItem.data;
          const ref = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: fileType,
            filename: 'video_' + attachedItem.id,
            encInfo,
            previews: [{data: adata.imagePreview, id: '0', type: 'jpeg'}],
            fileData: fileData,
          });

          //replace data with fileInfo
          attachedItem.data = {fileId: ref._id, fileType};
        } else if (attachedItem.type == 'file') {
          const {fileData, fileType, filename} = attachedItem.data || {};
          if (!fileData) {
            continue;
          }

          const ref = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: fileType || 'application/octet-stream',
            filename: filename || 'file_' + attachedItem.id,
            encInfo,
            fileData: fileData,
          });

          attachedItem.data = {
            fileId: ref._id,
            fileType: fileType || 'application/octet-stream',
            filename: filename || 'file_' + attachedItem.id,
          };
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

    const attachedItems = this.getPostAttachedItems(post);
    await this.assertCanShareAttachedLibraryItems(ctx, attachedItems, newlySharedWith);

    //Add to user feeds and create list of users to share attachments with
    await this.posts.updateWithId(postId, {sharedWith: sharedWith});
    const attachmentSharedUserIds = [];
    const sameAccountRestrictedRecipientUserIds = [];
    for (const userId of newlySharedWith) {
      const user = await this.users.findById(userId);
      if (user) {
        await this.userFeedService.add(ctx, userId, 'post', postId);
        if (user.accountId == ctx.accountId) {
          if (user.type === UserType.restricted) {
            sameAccountRestrictedRecipientUserIds.push(userId);
          } else {
            attachmentSharedUserIds.push(userId);
          }
        }
      }
    }
    for (const userId of noLongerSharedWith) {
      const feed = await this.userFeed.findMany({userId, refType: 'post', refId: postId});
      if (feed.length > 0) {
        await this.userFeed.updateWithId(feed[0]._id, {isDeleted: true});
      }
    }

    const collectionItemIds = await this.getAttachedCollectionItemIds(attachedItems);

    for (const attachment of attachedItems) {
      if (attachment.type === 'libItem' && !collectionItemIds.has(attachment.itemId)) {
        await this.permissionService.shareItemWithUsers(
          ctx,
          attachment.itemId,
          attachmentSharedUserIds,
          PermissionType.editor,
          true,
          false,
          true,
          false,
          true,
        );

        if (sameAccountRestrictedRecipientUserIds.length > 0) {
          await this.permissionService.shareItemWithUsers(
            ctx,
            attachment.itemId,
            sameAccountRestrictedRecipientUserIds,
            PermissionType.viewer,
            true,
            true,
            false,
            false,
            true,
          );
        }
      }
    }

    return true;
  }

  async saveAttachmentToLibrary(
    ctx: RequestContext,
    request: SavePostAttachmentToLibraryRequest,
  ): Promise<SavePostAttachmentToLibraryResponse> {
    const post = await this.posts.findById(request.postId);
    if (!post || post.deletedAt) {
      throw new Error('Post not found');
    }

    const isOwnPost = post.userId === ctx.currentUserId;
    const isSharedWithCurrentUser = Array.isArray(post.sharedWith) && post.sharedWith.includes(ctx.currentUserId);

    if (!isOwnPost && !isSharedWithCurrentUser) {
      throw new Error('Access denied');
    }

    const bundleAttachment = this.getPostAttachedItems(post).find(
      (attachment: any) => attachment?.type === 'libItemBundle' && attachment?.bundleId === request.bundleId,
    );

    const bundleItem = this.resolveSaveAttachmentBundleItem(post, request, bundleAttachment);

    if (!bundleItem) {
      throw new Error('Shared attachment not found');
    }

    const currentUser = await ctx.getCurrentUser();
    const sharer = await ctx.getUserById(post.userId);
    const isRestrictedLibraryOnly =
      currentUser?.type === UserType.restricted && currentUser?.options?.whitelistingEnabled === true;
    const sharerIsAdminInAccount = !!sharer && sharer.accountId === ctx.accountId && sharer.type === UserType.admin;

    if (isRestrictedLibraryOnly && !isOwnPost && !sharerIsAdminInAccount) {
      const requestType = typeof bundleItem.url === 'string' && bundleItem.url.length > 0 ? 'url' : 'item';
      const requestKey =
        requestType === 'url' ? bundleItem.url : `post_attachment_bundle:${request.postId}:${request.bundleId}`;

      return {
        action: 'request-required',
        requestPrefill: {
          key: requestKey,
          type: requestType,
          allowSwitchType: false,
          details: {
            url: bundleItem.url || undefined,
            srcType: 'post_attachment_bundle',
            srcId: request.bundleId,
            srcTitle: bundleItem.name || bundleItem.url || 'Shared attachment',
            actionCode: 'save_shared_post_attachment',
          },
        },
      };
    }

    const sanitizedSaveRequest = {
      ...request.saveRequest,
      ...this.buildBundleAttachmentSaveRequest(bundleItem, request.saveRequest?.details),
    };

    const saved = await this.itemService.saveItem(ctx, sanitizedSaveRequest);
    return {
      action: 'saved',
      itemId: saved.itemId,
    };
  }

  // ROUTE-METHOD
  async deletePost(ctx: RequestContext, id: string) {
    const post = await this.posts.findById(id);
    await ctx.verifySelfOrAdminOverUser(post.userId);

    return await this.posts.updateWithId(id, {deletedAt: new Date()});
  }
}

export default PostService;
