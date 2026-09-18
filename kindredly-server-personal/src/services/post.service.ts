import {HttpException} from '@/exceptions/HttpException';
import {PostRepo} from '@/db/post.repo';
import {clampPerPage} from '@/utils/pagination_utils';
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
import {filterToFields} from '@/utils/parse_utils';

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
      (attachedLibraryItems || []).filter((item) => item?.type === ItemTypeEnum.collection).map((item) => item._id),
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

  // Library-only ("whitelisting") restricted user — the only users whose post shares must come
  // from their library. Restricted users in filter-only mode share like anyone else.
  private isRestrictedLibraryOnlyUser(user: any): boolean {
    return user?.type === UserType.restricted && user?.options?.whitelistingEnabled === true;
  }

  private async assertCanShareAttachedLibraryItems(
    ctx: RequestContext,
    attachedItems: any[],
    recipientUserIds: string[],
  ) {
    if (!attachedItems?.length) {
      return;
    }

    const currentUser = await ctx.getCurrentUser();
    // Bundles carry post-only link data rather than a saved library item, and they grant
    // the recipient nothing: the permission loop below only ever runs for 'libItem'. A
    // library-only user may attach one for any URL, so a child can share a video from a
    // channel they have saved without a copy of that video existing in their library.
    //
    // The wall is on the receiving side, where it does not depend on the sender's client
    // being honest: a library-only recipient is granted temp access only for their own or
    // an account admin's post (ViewPost.canGrantSharedBundleTempAccess), and their save
    // attempt is answered by saveAttachmentToLibrary with an access request rather than a
    // save. A modified sender cannot make itself an admin, so refusing the sender here
    // bought nothing the recipient checks do not already cover.

    if (!recipientUserIds?.length) {
      return;
    }

    const attachedItemIds = Array.from(
      new Set(
        (attachedItems || [])
          .filter((attachment) => attachment?.type === 'libItem' || attachment?.type === 'libItemBundle')
          .map((attachment) => this.getAttachedShareSourceItemId(attachment))
          .filter((itemId) => !!itemId),
      ),
    );

    if (this.isRestrictedLibraryOnlyUser(currentUser)) {
      for (const itemId of attachedItemIds) {
        const isInCurrentUsersLibrary = await this.permissionService.isInLibraryForUser(ctx, ctx.currentUserId, itemId);
        if (!isInCurrentUsersLibrary) {
          throw new HttpException(403, 'You can only share links already saved in your library.');
        }
      }
    }

    for (const itemId of attachedItemIds) {
      const canShare = await this.permissionService._hasSharePermissionDirectOrAsAdmin(ctx, itemId);
      if (!canShare) {
        throw new HttpException(403, "You don't have permission to share one or more attached library items");
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
      .limit(clampPerPage(perPage, 100))
      .offset(currentPage)
      .orderBy('createdAt', 'desc');

    if (!includeTotalRows) return {records, count: null};
    const count = await this.posts.countRows({userId: targetUserId});
    return {records, count};
  }

  // ROUTE-METHOD
  // Returns all fan-out siblings of a grouped post so the AUTHOR can view every group's
  // isolated thread from one unified card. Author-only: recipients must never receive
  // sibling (cross-group) data — that would leak other groups' membership.
  async listByShareGroup(ctx: RequestContext, shareGroupId: string) {
    if (!shareGroupId) throw new Error('shareGroupId required');

    const siblings = await this.posts.findMany({shareGroupId}).where('deletedAt', null).orderBy('createdAt', 'asc');

    if (!siblings || siblings.length === 0) return [];

    // All siblings share the same author; gate on it.
    await ctx.verifySelfOrAdminOverUser(siblings[0].userId);

    const allUserIds = Array.from(new Set(siblings.flatMap((s) => (Array.isArray(s.sharedWith) ? s.sharedWith : []))));
    const users = await this.users.findWhereIdIn(allUserIds);
    const userLookup = Object.fromEntries(
      users.map((u) => [u._id, filterToFields(['_id', 'profileImage', 'username', 'displayedName'], u)]),
    );

    return siblings.map((s) => ({
      ...s,
      sharedWithUsers: (Array.isArray(s.sharedWith) ? s.sharedWith : []).map((uid) => userLookup[uid]).filter(Boolean),
    }));
  }

  async removeById(ctx: RequestContext, id: string) {
    return await this.posts.updateWithId(id, {deletedAt: new Date()});
  }

  // ROUTE-METHOD
  async createPost(ctx: RequestContext, createRequest: CreatePostRequest) {
    let {postType, data, attachedItems, sharedWith} = createRequest;
    let encInfo: EncInfo | null = createRequest.encInfo ?? null;
    const shareGroupId = createRequest.shareGroupId ?? null;
    const groupLabel = createRequest.groupLabel ?? null;

    // Grouped ("Separate recipients") sharing is admin-only. Each grouped sibling carries a
    // shareGroupId; restricted users must never create isolated-audience posts.
    if (shareGroupId) {
      await ctx.verifyCurrentUserIsAdmin();
    }

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
      shareGroupId,
      groupLabel,
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

  /** Attachment types whose payload is a file this service would otherwise upload. */
  private static readonly FILE_ATTACHMENT_TYPES = new Set(['imageFile', 'videoFile', 'file']);

  /**
   * Accept an attachment whose bytes the client already uploaded.
   *
   * Modern clients upload attachments ahead of the post (binary, or chunked above 16mb) and
   * send only a fileId, so a 100MB video never enters this request body. Older clients —
   * extension and mobile ship on their own cadence — still send base64 `fileData`, and those
   * fall through to the upload branches below.
   *
   * Returns true when the attachment was handled here.
   */
  private async _adoptPreUploadedAttachment(attachedItem: any, ctx: RequestContext): Promise<boolean> {
    if (!PostService.FILE_ATTACHMENT_TYPES.has(attachedItem?.type)) return false;

    const fileId = attachedItem?.data?.fileId;
    if (!fileId || typeof fileId !== 'string') return false;

    // A fileId is caller-supplied now, so it has to be checked. Without this, a post could
    // name any file id in the system and hand its recipients a reference to it.
    await this.userFileService.assertFileOwnedByAccount(ctx, fileId);

    // Never carry raw bytes into the post row alongside a fileId — a client that sends both
    // would otherwise persist the whole base64 payload in the attachedItems JSON.
    if (attachedItem.data?.fileData) {
      delete attachedItem.data.fileData;
    }
    if (attachedItem.data?.imagePreview) {
      delete attachedItem.data.imagePreview;
    }

    return true;
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

    // Rollout signal. /post/create still parses a 50mb JSON body only because old clients
    // inline base64 `fileData` here; that parser is the largest remaining OOM path on the
    // write side (app.ts:270). When this stops firing across shipped clients, the parser can
    // drop to a couple of mb.
    const legacyInlineCount = attachmentList.filter(
      (a) => PostService.FILE_ATTACHMENT_TYPES.has(a?.type) && !!a?.data?.fileData && !a?.data?.fileId,
    ).length;
    if (legacyInlineCount > 0) {
      console.info(
        `[post.create] legacy inline attachment payload: ${legacyInlineCount} attachment(s) sent base64 fileData instead of a pre-uploaded fileId`,
      );
    }

    if (attachmentList.length > 0) {
      for (const attachedItem of attachmentList) {
        // Already uploaded by the client, ahead of the post, through /userfile/uploadBinary
        // or the chunked route. Nothing to do here but confirm the file is ours — the
        // attachment already carries the shape the branches below produce.
        if (await this._adoptPreUploadedAttachment(attachedItem, ctx)) {
          continue;
        }

        if (attachedItem.type == 'imageFile') {
          const adata = attachedItem.data;
          const imageType = adata.imageType || 'jpeg';
          // A preview is optional. Sending {data: undefined} used to reach
          // `preview.data.length` in _upload and throw, failing the whole post.
          const previews = adata.imagePreview ? [{data: adata.imagePreview, id: '0', type: 'jpeg'}] : [];
          const ref = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: imageType,
            filename: 'image_' + attachedItem.id,
            encInfo,
            previews,
            fileData: adata.fileData || adata.image,
          });

          //replace data with fileInfo
          attachedItem.data = {fileId: ref._id, imageType, hasPreview: previews.length > 0};
        } else if (attachedItem.type == 'videoFile') {
          const adata = attachedItem.data;
          const {fileData, fileType} = attachedItem.data;
          // Quicktime (.mov) never gets a thumbnail on the client, so this is the common
          // case, not an edge case — it posts without a preview rather than failing.
          const previews = adata.imagePreview ? [{data: adata.imagePreview, id: '0', type: 'jpeg'}] : [];
          const ref = await this.userFileService._upload(ctx, {
            refId: postId,
            refType: 'post',
            fileType: fileType,
            filename: 'video_' + attachedItem.id,
            encInfo,
            previews,
            fileData: fileData,
          });

          //replace data with fileInfo
          attachedItem.data = {fileId: ref._id, fileType, hasPreview: previews.length > 0};
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

    // Grouped posts keep audiences isolated per sibling; editing one sibling's recipients
    // would break that guarantee. Editing group membership is a phase-2 feature.
    if (post.shareGroupId) {
      throw new Error(
        "Recipients of a grouped post can't be edited individually. Delete and re-share to change groups.",
      );
    }

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

  // ROUTE-METHOD
  // Owner-only, dumb persistence: this route only extends an already-encrypted post's key list
  // (e.g. to add a wrapped key for a newly-shared friend). Validating which keys are legitimate
  // is the client's job (EncryptionSharingService); this route doesn't diff or inspect contents.
  async updatePostEncInfo(ctx: RequestContext, postId: string, encInfo: EncInfo) {
    const post = await this.posts.findById(postId);
    if (!post || post.deletedAt) throw new Error('Post not found');
    await ctx.verifySelfOrAdminOverUser(post.userId);

    if (!post.encInfo) throw new Error('Post is not encrypted');

    await this.posts.updateWithId(postId, {encInfo});
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
    const isRestrictedLibraryOnly = this.isRestrictedLibraryOnlyUser(currentUser);
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

    const deletedAt = new Date();

    // Grouped posts fan out to one sibling per group; deleting one must delete them all so
    // no group is left with an orphaned thread.
    if (post.shareGroupId) {
      const siblings = await this.posts.findMany({shareGroupId: post.shareGroupId}).where('deletedAt', null);
      for (const sibling of siblings) {
        await this.posts.updateWithId(sibling._id, {deletedAt});
        const feeds = await this.userFeed.findMany({refType: 'post', refId: sibling._id});
        for (const feed of feeds) {
          if (!feed.isDeleted) await this.userFeed.updateWithId(feed._id, {isDeleted: true});
        }
      }
      return true;
    }

    return await this.posts.updateWithId(id, {deletedAt});
  }
}

export default PostService;
