import {v4 as uuidv4} from 'uuid';
import EventAuditService from './record_event.service';

import {AccountRepo} from '@/db/account.repo';
import {ItemRepo} from '@/db/item.repo';
import {UserRepo} from '@/db/user.repo';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';
import Item from 'tset-sharedlib/schemas/public/Item';
import AccessRequestService from './access_request.service';
import FeedbackService from './feedback.service';
import ItemRelationService from './item.relations';
import NotificationService from './notification.service';
import PermissionService from './permission.service';
import {AuditLogService} from './audit_log.service';
import {RequestContext} from '../base/request_context';
import {UserPermRepo} from '@/db/user_perm.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import ChangeLogService from './change_log.service';
import UserFileService from './user_file.service';
import {EventRecordName, EventRecordType, NotificationType} from '@/typing/enum_strings';
import {
  ItemAttachment,
  ItemTypeEnum,
  ItemFeedbackView,
  PermissionType,
  PermissionTypeList,
  PermissionTypeEditableList,
  UserType,
  ItemInfoView,
  ItemRelationView,
  SharedItemReactionView,
} from 'tset-sharedlib/shared.types';
import ItemFeedback from 'tset-sharedlib/schemas/public/ItemFeedback';
import {logger} from '@/utils/logger';
import {DynamicObject} from '@/utils/crypto_util';
import {assertEncInfoUpdateIsSafe, payloadContainsCiphertext} from '@/utils/encinfo_guards';
import {SysInfoRepo} from '@/db/sysinfo.repo';
import {container} from '@/inversify.config';
import {DefaultCategories} from 'tset-sharedlib/constants';
import {SaveItemRequest, SaveItemResponse, CreateCollectionOptions} from 'tset-sharedlib/api';
import {getFeedbackData} from '@/utils/feedback_helpers';
import {computeFeedbackUpdate} from 'tset-sharedlib/feedback.utils';
import {isEligibleForRestrictedLibraryHide, normalizeSubTypeForType} from 'tset-sharedlib/content.types';
import {getDetailsByAccountType} from '@/defaults/products_and_plans';

const validAttributes = new Set([
  'name',
  'description',
  'comment',
  'type',
  'subType',
  'permanent',
  'visibility',
  'categories',
  'tags',
  'useCriteria',
  'url',
  'patterns',
  'imageFilename',
  'info',
  'meta',
  'metaUpdatedAt',
  'published',
  'publishId',
  'publishName',
  'publishDescription',
  'publishVisibilityCode',
  'publishUpdateType',
  'publishType',
  'publishConfig',
  'deleted',
  'sourceInfo',
  'archived',
  'encInfo',
  'encrypted',
]);

function getSanitizedItemForSaving(data: Item): Item {
  let newData: Item = {};
  for (const [key, value] of Object.entries(data)) {
    if (validAttributes.has(key)) {
      newData[key] = value;
    }
  }

  const normalizedSubType = normalizeSubTypeForType(newData.type, newData.subType);
  if (normalizedSubType) {
    newData.subType = normalizedSubType;
  } else if (Object.prototype.hasOwnProperty.call(newData, 'subType')) {
    newData.subType = null;
  }

  return newData;
}

function checkIfItemIsEncrypted(data: Item) {
  let encrypted = false;
  if (data?.encInfo && 'decrypt' in data.encInfo && data.encInfo.decrypt === true) {
    data.encInfo = null;
  }
  if (data?.encInfo != null && Array.isArray((data as any).encInfo?.keys) && (data as any).encInfo.keys.length > 0) {
    encrypted = true;
  }
  return encrypted;
}

function hasValidEncInfoKeys(encInfo: any): boolean {
  return !!(encInfo && typeof encInfo === 'object' && Array.isArray(encInfo.keys) && encInfo.keys.length > 0);
}

interface UserData {
  collectionIdHistory?: string[];
}

class ItemService {
  private accounts = new AccountRepo();
  private changeLog = new UserChangeLogRepo();
  private permissionsRepo = new UserPermRepo();
  private itemRelations = new ItemRelationRepo();
  private evenLogService = new EventAuditService();
  private feedbackService = new FeedbackService();

  private itemRepo = new ItemRepo();
  private notificationsService = container.resolve(NotificationService);

  private permissionService = new PermissionService();
  private users = new UserRepo();
  private accessRequestService = new AccessRequestService();
  private itemRelationService = new ItemRelationService();
  private changeLoggerService = new ChangeLogService();
  private userFileService = container.resolve(UserFileService);
  private sysInfo = new SysInfoRepo();

  // ROUTE-METHOD
  // Removes a user file safely:
  // 1) Detaches any item attachments referencing this fileId where caller can edit the item.
  // 2) Deletes the underlying user_file + stored bytes only if no items still reference it.
  async removeUserFileById(
    ctx: RequestContext,
    fileId: string,
  ): Promise<{
    deleted: boolean;
    removedAttachmentCount: number;
    detachedFromItemCount: number;
    blockedItemIds: string[];
    remainingItemIds: string[];
  }> {
    if (!fileId) {
      throw new Error('Missing fileId');
    }

    const userFile = await this.userFileService.getUserFileMetaById(ctx, fileId);
    if (!userFile) {
      throw new Error('UserFile not found');
    }

    await ctx.verifySelfOrAdmin(userFile.userId as any);

    const itemsWithFile = await this.itemRepo.findItemsWithFileId(fileId);
    const blockedItemIds: string[] = [];
    let removedAttachmentCount = 0;
    let detachedFromItemCount = 0;

    for (const item of itemsWithFile) {
      const itemId = item._id as any;
      if (!itemId) {
        continue;
      }

      const canEdit = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
      if (!canEdit) {
        blockedItemIds.push(itemId);
        continue;
      }

      const attachmentData = (item as any).attachments || {entries: []};
      const attachments = attachmentData?.entries || [];
      const remainingAttachments = attachments.filter((a: any) => a?.fileId !== fileId);
      const removedCountForItem = attachments.length - remainingAttachments.length;

      if (removedCountForItem > 0) {
        removedAttachmentCount += removedCountForItem;
        detachedFromItemCount += 1;
        attachmentData.entries = remainingAttachments;
        await this.itemRepo.updateWithId(itemId, {attachments: attachmentData});
      }
    }

    const remainingItems = await this.itemRepo.findItemsWithFileId(fileId);
    const remainingItemIds = remainingItems.map((i: any) => i._id).filter(Boolean);
    if (remainingItemIds.length > 0) {
      return {
        deleted: false,
        removedAttachmentCount,
        detachedFromItemCount,
        blockedItemIds,
        remainingItemIds,
      };
    }

    await this.userFileService._removeUserFileById(ctx, fileId);

    return {
      deleted: true,
      removedAttachmentCount,
      detachedFromItemCount,
      blockedItemIds,
      remainingItemIds: [],
    };
  }

  // ROUTE-METHOD
  // Scans a user's files for ones that appear unused (not referenced by any item attachments).
  // Optionally deletes them in bulk using removeUserFileById() for safety.
  async cleanupUnusedUserFiles(
    ctx: RequestContext,
    input: {
      userId?: string;
      dryRun?: boolean;
      maxToScan?: number;
      maxToDelete?: number;
    },
  ): Promise<{
    scannedCount: number;
    candidateCount: number;
    deletedCount: number;
    bytesFreed: number;
    candidates: Array<{
      fileId: string;
      filename?: string | null;
      fileType?: string | null;
      fileSize?: number | null;
      refType?: string | null;
      refId?: string | null;
    }>;
    errors: Array<{fileId: string; error: string}>;
  }> {
    const targetUserId = input?.userId || (ctx as any).userId;
    if (!targetUserId) {
      throw new Error('Missing userId');
    }

    await ctx.verifySelfOrAdmin(targetUserId);

    const dryRun = input?.dryRun !== false;
    const maxToScan = Math.max(1, Math.min(Number(input?.maxToScan ?? 1000), 5000));
    const maxToDelete = Math.max(1, Math.min(Number(input?.maxToDelete ?? 200), 2000));

    const userFiles = await this.userFileService.listFilesForUser(ctx, targetUserId);
    const scanList = userFiles.slice(0, maxToScan);

    const candidates: Array<{
      fileId: string;
      filename?: string | null;
      fileType?: string | null;
      fileSize?: number | null;
      refType?: string | null;
      refId?: string | null;
    }> = [];

    for (const uf of scanList as any[]) {
      const fileId = uf?._id;
      if (!fileId) continue;
      // If any item still references this fileId, treat as in-use.
      const itemsWithFile = await this.itemRepo.findItemsWithFileId(fileId);
      if (!itemsWithFile || itemsWithFile.length === 0) {
        candidates.push({
          fileId,
          filename: uf?.filename ?? null,
          fileType: uf?.fileType ?? null,
          fileSize: uf?.fileSize ?? null,
          refType: uf?.refType ?? null,
          refId: uf?.refId ?? null,
        });
      }
    }

    let deletedCount = 0;
    let bytesFreed = 0;
    const errors: Array<{fileId: string; error: string}> = [];

    if (!dryRun) {
      const toDelete = candidates.slice(0, maxToDelete);
      for (const c of toDelete) {
        try {
          const r = await this.removeUserFileById(ctx, c.fileId);
          if (r?.deleted) {
            deletedCount += 1;
            const n = Number(c.fileSize ?? 0);
            if (Number.isFinite(n) && n > 0) bytesFreed += n;
          }
        } catch (e) {
          errors.push({fileId: c.fileId, error: String(e)});
        }
      }
    }

    return {
      scannedCount: scanList.length,
      candidateCount: candidates.length,
      deletedCount,
      bytesFreed,
      candidates,
      errors,
    };
  }

  //--------------------
  //-------Common ---------
  //--------------------

  async _getAllCategories() {
    // label if available
    let availableCatsIds = await this._getAvailCategories();
    let results = [];
    for (const cat of DefaultCategories) {
      if (availableCatsIds.includes(cat.id)) {
        results.push({...cat, available: true});
      } else {
        results.push({...cat});
      }
    }
    return results;
  }

  async _getAvailCategories(): Promise<string[]> {
    const cats = (await this.sysInfo.findById('cats')) as DynamicObject;

    if (!cats) return [];
    else {
      logger.info('cats', cats);
      let catsList = cats?.data?.items || [];
      return catsList;
    }
  }

  async getCategories() {
    return await this._getAllCategories();
  }

  async _getItemsByQuery(query): Promise<Item[]> {
    return await this.itemRepo.findMany(query);
  }

  async _getItemsWithIdWhere(ids: string[], query): Promise<Item[]> {
    return await this.itemRepo.findMany(query).whereIn('_id', ids);
  }

  async _getCollectionCount(accountId: string) {
    return await this.itemRepo.countRows({accountId, type: ItemTypeEnum.collection});
  }

  async _getLibraryItemCount(accountId: string) {
    return await this.itemRepo.countFromQuery(
      this.itemRepo.query().where({accountId}).whereNot({type: ItemTypeEnum.collection}),
    );
  }

  private async getAccountPlanLimits(ctx: RequestContext) {
    const account = await ctx.getAccount();
    return getDetailsByAccountType(account?.accountType);
  }

  private async assertCanCreateLibraryItem(ctx: RequestContext) {
    const limits = await this.getAccountPlanLimits(ctx);
    const maxTotalItems = Number(limits?.maxTotalItems ?? 0);
    if (!maxTotalItems) {
      return;
    }

    const itemCount = await this._getLibraryItemCount(ctx.accountId);
    if (itemCount >= maxTotalItems) {
      throw new Error(`You already have the maximum number (${maxTotalItems}) of library items in your account.`);
    }
  }

  async updateAvailCategories(categories: string[], replace = false) {
    if (!categories || !Array.isArray(categories)) {
      console.error('Failed to update categories, with ', categories);
      return;
    }

    logger.info('Updating available categories in database', categories);
    const currentCats = replace ? [] : (await this._getAvailCategories()) || [];

    const cats = new Set([...currentCats, ...categories]);

    //TODO: silly to sort here
    const catsList = Array.from(cats).filter((v) => !!v);
    logger.info('catsList', catsList);
    await this.sysInfo.create({_id: 'cats', data: {items: catsList}});
  }

  // ROUTE-METHOD
  async getPathTree(ctx: RequestContext, targetUserId: string, itemId: string, selectedParentId = null) {
    await ctx.verifyInAccount(targetUserId);
    return await this._getPathTree(ctx, targetUserId, itemId, selectedParentId);
  }

  async _getPathTree(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string,
    selectedParentId = null,
    depth = 0,
    results: Array<{item: Item; others: Item[]; earlyEnd: boolean}> = [],
    maxDepth = 6,
  ): Promise<Array<{item: Item; others: Item[]; earlyEnd: boolean}>> {
    let parentsItemView = await this._getParentItemsForUser(ctx, targetUserId, itemId);
    let parents = parentsItemView ? parentsItemView.map((v) => v.details) : [];

    if (!parents || parents.length == 0) {
      return results;
    } else {
      let selectedParentIdx = 0;

      if (selectedParentId) {
        selectedParentIdx = parents.findIndex((v) => v._id == selectedParentId);
      }

      const item = parents[selectedParentIdx];
      selectedParentId = item._id;
      parents.splice(selectedParentIdx, 1);
      const earlyEnd = depth >= maxDepth;

      results.push({item: item, others: parents, earlyEnd: earlyEnd});
      if (earlyEnd) {
        return results;
      } else {
        return await this._getPathTree(ctx, targetUserId, selectedParentId, null, depth + 1, results);
      }
    }
  }

  //------------------------
  //----- Collections-------
  //------------------------

  // ROUTE-METHOD
  async createCollection(
    ctx: RequestContext,
    targetUserId: string,
    itemDetails: Item,
    options: CreateCollectionOptions = {
      collectionIds: [],
      permList: [],
      customPermissions: false,
      skipNotifications: false,
    },
  ): Promise<string> {
    //TODO: convert to limited to avoid admins adding collections for other admin users
    await ctx.verifySelfOrAdmin(targetUserId);

    const account = await this.accounts.findById(ctx.accountId);
    const planLimits = getDetailsByAccountType(account?.accountType);
    const colCount = await this._getCollectionCount(ctx.accountId);
    const maxCollections = Number(planLimits?.maxCollection ?? account?.maxCollections ?? 0);
    if (maxCollections > 0 && colCount >= maxCollections)
      throw Error(`You already have the maximum number (${maxCollections}) of collections in your account.`);

    const now = new Date();

    const itemId = 'col_' + uuidv4();

    const itemToSave = getSanitizedItemForSaving(itemDetails);

    if (itemToSave?.encInfo != null && !hasValidEncInfoKeys((itemToSave as any).encInfo)) {
      throw new Error('Invalid encInfo for createCollection: expected encInfo.keys[]');
    }

    if (itemToSave?.encInfo != null && !payloadContainsCiphertext(itemToSave)) {
      throw new Error('Refusing to create encrypted collection without ciphertext payload');
    }

    let encrypted = checkIfItemIsEncrypted(itemToSave);

    const item: Item = {
      ...itemToSave,
      _id: itemId,
      userId: targetUserId,
      accountId: ctx.accountId,
      createdAt: now,
      updatedAt: now,
      type: ItemTypeEnum.collection,
      encrypted: encrypted,
    };

    let {collectionIds = [], permList = [], customPermissions = false, skipNotifications = false} = options;

    await this.itemRepo.create(item);

    try {
      await AuditLogService.instance.log(ctx, {
        action: 'collection.create',
        entityType: 'collection',
        entityId: itemId,
        relatedIds: {ownerUserId: targetUserId},
      });
    } catch (e) {
      console.error('audit_log: failed to log collection.create', e);
    }

    // add item to parents
    if (collectionIds) {
      for (const colId of collectionIds) {
        await this.itemRelationService._addItemToCollection(ctx, colId, itemId, ItemTypeEnum.collection);
      }
    }

    if (ctx.currentUserId != targetUserId && !skipNotifications) {
      this.permissionService._sendShareNotification(ctx, targetUserId, item).catch((e) => {
        console.error('Error sending share notification', e);
      });
    }

    const user = await this.users.findById(targetUserId);
    const userData = (user.userData || {}) as UserData;
    let collectionIdHistory = userData['collectionIdHistory'] || [];
    collectionIdHistory = [itemId, ...collectionIdHistory].slice(0, 5);
    userData.collectionIdHistory = collectionIdHistory;
    await this.users.updateWithId(targetUserId, {userData});

    if ((!permList || permList.length == 0) && collectionIds) {
      const permMap: Record<string, {userId: string; permission: PermissionType}> = {};
      for (const pcolId of collectionIds) {
        const parentPerms = await this.permissionService._listAllDirectPermissionsForAllUsersPermissionToItem(pcolId);
        for (const parentPerm of parentPerms) {
          permMap[parentPerm.userId] = parentPerm as {userId: string; permission: PermissionType};
        }
      }
      permList.push(...Object.values(permMap));
    }

    if (permList && permList.length > 0) {
      for (const perm of permList) {
        if (perm.userId != targetUserId && PermissionTypeList.includes(perm.permission)) {
          let addedPermission = perm.permission;

          //We can only have one owner, the user adding the collection
          if (addedPermission == PermissionType.owner) addedPermission = PermissionType.editor;
          await this.permissionService._setUserPermission(ctx, perm.userId, itemId, addedPermission);

          if (ctx.currentUserId != perm.userId && perm.permission != PermissionType.owner && !skipNotifications) {
            this.permissionService._sendShareNotification(ctx, perm.userId, item).catch((e) => {
              console.error('Error sending share notification', e);
            });
          }
        }
      }
    }

    // list all users with permission
    const usersToUpdate = new Set([targetUserId]);
    if (permList && permList.length > 0) {
      for (const perm of permList) {
        usersToUpdate.add(perm.userId);
      }
    }

    this.changeLoggerService.logItemChangeForUserIds(Array.from(usersToUpdate), [itemId]).catch((e) => {});

    this.evenLogService
      .recordEvent({
        eventName: EventRecordName.CREATE_ACCOUNT,
        eventType: EventRecordType.EXPLICIT,
        accountId: ctx.accountId,
        userId: targetUserId,
      })
      .catch((e) => {});

    return itemId;
  }

  // ROUTE-METHOD
  async removeUserCollections(ctx: RequestContext, targetUserId: string, collectionIds = [], fullRemove = false) {
    if (fullRemove) {
      await ctx.verifySelfOrAdmin(targetUserId);

      for (const cid of collectionIds) {
        await this.permissionService._removeUserPermission(targetUserId, cid);
      }
      return {};
    }

    const targetUser = await ctx.getUserById(targetUserId);

    await this.updateUserLibraryMembership(ctx, targetUserId, collectionIds, true, {
      requireClassified: targetUser?.type === UserType.restricted,
    });
    return {};
  }

  // ROUTE-METHOD
  async addUserCollectionsToLibrary(ctx: RequestContext, targetUserId: string, collectionIds = []) {
    await this.updateUserLibraryMembership(ctx, targetUserId, collectionIds, false);
    return {};
  }

  // ROUTE-METHOD
  async addUserItemsToLibrary(ctx: RequestContext, targetUserId: string, itemIds = []) {
    await this.updateUserLibraryMembership(ctx, targetUserId, itemIds, false);
    return {};
  }

  // ROUTE-METHOD
  async removeUserItemsFromLibrary(ctx: RequestContext, targetUserId: string, itemIds = []) {
    await this.updateUserLibraryMembership(ctx, targetUserId, itemIds, true, {
      requireClassified: true,
    });
    return {};
  }

  private async updateUserLibraryMembership(
    ctx: RequestContext,
    targetUserId: string,
    itemIds: string[],
    hidden: boolean,
    options: {requireClassified?: boolean} = {},
  ) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const targetUser = await ctx.getUserById(targetUserId);
    if (options.requireClassified && targetUser?.type !== UserType.restricted) {
      throw new Error('Only restricted users can hide classified items from their library');
    }

    const pendingUpdates: Array<{
      permId: string;
      itemId: string;
      existing: any | null;
    }> = [];

    // Batch the per-item item + permission lookups (was 2 findById queries per
    // item). The per-item isInLibraryForUser check below stays as-is — batching
    // it needs a plural permission-lookup redesign (tracked separately).
    const validItemIds = (itemIds || []).filter(Boolean);
    const itemsList = await this.itemRepo.findWhereIdIn(validItemIds);
    const itemById = new Map(itemsList.map((it) => [it._id, it]));
    const permIdByItemId = new Map(
      validItemIds.map((id) => [id, this.permissionService.createPermissionKey(targetUserId, id)]),
    );
    const existingPermsList = await this.permissionsRepo.findWhereIdIn([...permIdByItemId.values()]);
    const existingPermById = new Map(existingPermsList.map((p) => [p._id, p]));

    for (const itemId of itemIds || []) {
      if (!itemId) {
        continue;
      }

      const item = itemById.get(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      if (options.requireClassified) {
        if (!isEligibleForRestrictedLibraryHide((item as any).useCriteria)) {
          throw new Error('Item is not eligible for library hiding');
        }
      }

      const permId = permIdByItemId.get(itemId);
      const existing = existingPermById.get(permId);

      const hasEffectiveLibraryAccess =
        item.userId === targetUserId
          ? true
          : await this.permissionService.isInLibraryForUser(ctx, targetUserId, itemId);

      if (!existing && !hasEffectiveLibraryAccess) {
        continue;
      }

      if ((existing as any)?.notInLibrary === hidden) {
        continue;
      }

      pendingUpdates.push({
        permId,
        itemId,
        existing: existing || null,
      });
    }

    for (const update of pendingUpdates) {
      if (!update.existing) {
        await this.permissionsRepo.create({
          _id: update.permId,
          userId: targetUserId,
          itemId: update.itemId,
          permission: null,
          notInLibrary: hidden,
          sharedByUserId: null,
          createdAt: new Date(),
        } as any);
        continue;
      }

      await this.permissionsRepo.updateWithId(update.permId, {
        ...update.existing,
        notInLibrary: hidden,
      } as any);
    }
  }

  async _createDefaultQuickBarCollection(ctx: RequestContext, targetUserId: string) {
    const user = await ctx.getUserById(targetUserId);
    if (user.quickBarCollectionId) {
      const col = await this.itemRepo.findById(user.quickBarCollectionId);
      if (col.subType == 'defaultQuickbar') {
        console.log('Quickbar exists');
        return false;
      }
    }

    const newCollectionId = await this.createCollection(
      ctx,
      targetUserId,
      {
        name: 'Quickbar',
        subType: 'defaultQuickbar',
        permanent: true,
      },
      {skipNotifications: true},
    );

    await this.users.updateWithId(user._id, {
      quickBarCollectionId: newCollectionId,
    });
    return true;
  }

  async _createDefaultSharedCollection(ctx: RequestContext, targetUserId: string) {
    const users = await this.users.listByAccountId(ctx.accountId);

    if (users.length == 1) {
      return;
    }

    const targetUser = await ctx.getUserById(targetUserId);

    const permissionSt = targetUser.type == UserType.admin ? PermissionType.editor : PermissionType.viewer;

    const defaultSharedCollection = await this.itemRepo.findWhere({
      accountId: ctx.accountId,
      subType: 'defaultSharedCollection',
    });

    if (defaultSharedCollection != null) {
      console.log('Default shared collection exists, giving permission');
      await this.permissionService._setUserPermission(ctx, targetUserId, defaultSharedCollection._id, permissionSt);
      return;
    }

    const newCollectionId = await this.createCollection(
      ctx,
      ctx.currentUserId,
      {
        name: 'Shared Collection',
        description: 'Default shared collection for all users in the account.',
        subType: 'defaultSharedCollection',
        permanent: true,
      },
      {skipNotifications: false},
    );

    await this.permissionService.setUserPermission(ctx, targetUserId, newCollectionId, permissionSt);

    return true;
  }

  // ROUTE-METHOD
  // Creates a per-user Showcase collection on demand.
  // - Not auto-created on signup
  // - Exactly one per user (idempotent)
  async createShowcaseCollection(
    ctx: RequestContext,
    targetUserId: string,
    details?: Partial<Item>,
    options?: CreateCollectionOptions,
  ): Promise<string> {
    await ctx.verifySelfOrAdmin(targetUserId);

    const existing = await this.itemRepo.findWhere({
      accountId: ctx.accountId,
      userId: targetUserId,
      type: ItemTypeEnum.collection,
      subType: 'defaultShowcaseCollection',
    } as any);
    if (existing?._id) {
      if ((existing as any).visibility !== 'network') {
        await this.itemRepo.updateWithId(existing._id as any, {visibility: 'network'} as any);
      }
      return existing._id as any;
    }

    const baseDetails: Partial<Item> = {
      name: 'Showcase',
      description: null,
      // Default Showcase discoverability: family + confirmed friends.
      // "Private" here means "not publicly published".
      visibility: 'network' as any,
      ...details,
      // Enforce subtype + permanence regardless of caller-provided details.
      subType: 'defaultShowcaseCollection',
      permanent: true,
    };

    const collectionId = await this.createCollection(
      ctx,
      targetUserId,
      baseDetails as any,
      {
        ...(options || {}),
        skipNotifications: true,
      } as any,
    );

    return collectionId;
  }

  // ROUTE-METHOD
  // Returns the Showcase collection id for a user, or null if it doesn't exist.
  // Does NOT create it.
  async getShowcaseCollectionId(ctx: RequestContext, targetUserId: string): Promise<string | null> {
    // Showcase is a per-user system collection. Friends are cross-account, so we must
    // query by the target user's accountId (not the viewer's).
    const targetUser = await ctx.getUserById(targetUserId);

    const existing = await this.itemRepo.findWhere({
      accountId: targetUser.accountId,
      userId: targetUserId,
      type: ItemTypeEnum.collection,
      subType: 'defaultShowcaseCollection',
    } as any);

    // Do not leak whether a Showcase exists.
    if (!existing?._id) return null;

    // Owner/admin-in-account can always resolve it.
    if (ctx.currentUserId === targetUserId || (await ctx.isSelfOrAdmin(targetUserId))) {
      return existing._id as any;
    }

    // Friends/family can resolve it only when it's network-discoverable.
    try {
      await ctx.verifyInNetwork([targetUserId]);
    } catch {
      return null;
    }
    if ((existing as any).visibility !== 'network') return null;
    return existing._id as any;
  }

  // ROUTE-METHOD
  async updateQuickBar(ctx: RequestContext, itemId) {
    await this.users.updateWithId(ctx.currentUserId, {
      quickBarCollectionId: itemId,
    });
    return {};
  }

  async _getCollectionsForAccount(accountId) {
    const collections = await this._getItemsByQuery({
      accountId: accountId,
      type: ItemTypeEnum.collection,
    });
    return collections;
  }

  async _getCollectionsWithName(accountId, name) {
    const cols = await this._getItemsByQuery({
      accountId,
      name,
      type: ItemTypeEnum.collection,
    });
    return cols;
  }

  async _getCollectionsWithpublishId(accountId, publishId) {
    const cols = await this._getItemsByQuery({accountId, publishId});
    return cols;
  }

  async listChildItemIdsForCollectionWithId(collectionId: string) {
    const items = await this.itemRelations.findMany({collectionId});

    return items.filter((v) => v.itemType != ItemTypeEnum.collection).map((v) => v.itemId);
  }

  private async _listChildRelationsForCollection(collectionId: string) {
    return await this.itemRelations.findMany({collectionId});
  }

  /**
   * Returns ids of descendants that are safe to delete when deleting a collection.
   * "Safe" means the descendant has exactly one parent collection relation.
   *
   * - Traverses into child collections only when that child collection is also safe to delete.
   * - Produces child collections in post-order (children before parent).
   */
  private async _collectDeletableDescendantsForCollection(rootCollectionId: string): Promise<{
    itemIds: string[];
    collectionIdsPostOrder: string[];
  }> {
    const visitedCollections = new Set<string>();
    const itemIdsToDelete: string[] = [];
    const collectionIdsPostOrder: string[] = [];

    const stack: Array<{collectionId: string; state: 'enter' | 'exit'}> = [
      {collectionId: rootCollectionId, state: 'enter'},
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;
      const collectionId = frame.collectionId;

      if (frame.state === 'exit') {
        // Don't include root itself; caller deletes it separately.
        if (collectionId !== rootCollectionId) {
          collectionIdsPostOrder.push(collectionId);
        }
        continue;
      }

      if (visitedCollections.has(collectionId)) {
        continue;
      }
      visitedCollections.add(collectionId);

      // Post-order: push exit marker first.
      stack.push({collectionId, state: 'exit'});

      const childRelations = await this._listChildRelationsForCollection(collectionId);
      if (!childRelations || childRelations.length === 0) continue;

      const childIds = childRelations.map((r) => r.itemId).filter((id) => !!id && id !== collectionId);

      if (childIds.length === 0) continue;

      // Parent counts across ALL collections (not just within this subtree).
      const parentRelations = await this.itemRelations.findWhereIn('itemId', childIds);
      const parentCounts: Record<string, number> = {};
      for (const rel of parentRelations) {
        parentCounts[rel.itemId] = (parentCounts[rel.itemId] || 0) + 1;
      }

      for (const rel of childRelations) {
        const childId = rel.itemId;
        if (!childId || childId === collectionId) continue;

        // Only delete descendants that would otherwise be orphaned.
        if (parentCounts[childId] !== 1) continue;

        if (rel.itemType === ItemTypeEnum.collection) {
          // Only traverse into child collections we will also delete.
          stack.push({collectionId: childId, state: 'enter'});
        } else {
          itemIdsToDelete.push(childId);
        }
      }
    }

    return {itemIds: itemIdsToDelete, collectionIdsPostOrder};
  }

  /**
   * Used by routes to ensure the changelog includes all ids that will be removed,
   * so clients can remove stale items from local indices without a full reset.
   */
  async previewDeleteItemIds(ctx: RequestContext, itemId: string, deleteChildren = false): Promise<string[]> {
    if (!itemId) return [];

    const item = await this.itemRepo.findById(itemId);
    if (!item) return [itemId];

    const hasPerm = await this.permissionService._hasPermissionDirectlyOrAsAdmin(
      ctx,
      itemId,
      PermissionTypeEditableList,
    );
    if (!hasPerm) {
      throw new Error('No permission to delete item');
    }

    if (item.type !== ItemTypeEnum.collection || !deleteChildren) {
      return [itemId];
    }

    const {itemIds, collectionIdsPostOrder} = await this._collectDeletableDescendantsForCollection(itemId);

    // Include root. Order doesn't matter for changelog; keep stable-ish ordering.
    const allIds = [itemId, ...collectionIdsPostOrder, ...itemIds];
    return [...new Set(allIds)];
  }

  // ROUTE-METHOD
  // TODO: incomplete
  async removeCollectionById(ctx: RequestContext, collectionId: string, deleteItems: boolean = false) {
    // check permissions
    const collection = await this.itemRepo.findById(collectionId);
    if (!collection) {
      return true;
    }

    if (
      !(await this.permissionService._hasPermissionDirectlyOrAsAdmin(ctx, collectionId, [
        PermissionType.owner,
        PermissionType.editor,
      ]))
    ) {
      throw new Error('no permissions');
    }

    if (deleteItems) {
      let itemIds = await this.listChildItemIdsForCollectionWithId(collectionId);

      // get items with only one parent
      let relations = await this.itemRelations.findWhereIn('itemId', itemIds);
      let itemCounts = {};
      for (const relation of relations) {
        if (!itemCounts[relation.itemId]) {
          itemCounts[relation.itemId] = 0;
        }
        itemCounts[relation.itemId] += 1;
      }

      let deleteItems = [];
      for (const itemId of itemIds) {
        if (itemCounts[itemId] == 1) {
          deleteItems.push(itemId);
        }
      }
      await this.permissionsRepo.deleteWhereIn('itemId', deleteItems);

      await this.feedbackService.itemFeedbackRepo.deleteWhereIn('itemId', deleteItems);

      // TODO: delete comments?

      await this.itemRepo.deleteWhereIn('_id', deleteItems);
    }

    await this.itemRelations.deleteWhere({collectionId: collectionId});

    await this.itemRelationService._removeCollectionItems(ctx, collectionId);
    await this.permissionService._deleteCollectionFromAllUserPermissions(collectionId);
    await this.itemRepo.deleteWithId(collectionId);

    return true;
  }

  // ROUTE-METHOD
  // CONSOLIDATED: Now handles both items and collections (merged from removeCollectionById)
  async deleteItem(ctx: RequestContext, itemId: string, deleteChildren = false) {
    console.log('Deleting item', itemId);

    if (!itemId) {
      throw new Error('No item id provided');
    }

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      return true;
    }

    let hasPerm = await this.permissionService._hasPermissionDirectlyOrAsAdmin(ctx, itemId, PermissionTypeEditableList);
    if (!hasPerm) {
      throw new Error('No permission to delete item');
    }

    // Collection-specific deletion logic (merged from removeCollectionById)
    if (item.type === ItemTypeEnum.collection && deleteChildren) {
      const {itemIds, collectionIdsPostOrder} = await this._collectDeletableDescendantsForCollection(itemId);

      const allDescendantIds = [...itemIds, ...collectionIdsPostOrder];

      if (allDescendantIds.length > 0) {
        await this.permissionsRepo.deleteWhereIn('itemId', allDescendantIds);
        await this.feedbackService.itemFeedbackRepo.deleteWhereIn('itemId', allDescendantIds);

        // Remove relations where these items are children or parents.
        await this.itemRelations.deleteWhereIn('itemId', allDescendantIds);
        await this.itemRelations.deleteWhereIn('collectionId', collectionIdsPostOrder);

        // Clean up user permission references for deleted child collections.
        for (const deletedCollectionId of collectionIdsPostOrder) {
          await this.permissionService._deleteCollectionFromAllUserPermissions(deletedCollectionId);
        }

        await this.itemRepo.deleteWhereIn('_id', allDescendantIds);
      }
    }

    await this.permissionsRepo.deleteWhere({itemId: itemId});
    await this.itemRelations.deleteWhere({itemId: itemId});
    await this.itemRelations.deleteWhere({collectionId: itemId});

    let attachments = item.attachments?.entries || ([] as ItemAttachment[]);
    try {
      for (const att of attachments) {
        if (att.fileId) {
          // Check if any other items reference this fileId before deleting
          const itemsWithFile = await this.itemRepo.findItemsWithFileId(att.fileId);
          const isFileUsedElsewhere = itemsWithFile.some((item) => item._id !== itemId);

          if (!isFileUsedElsewhere) {
            // Safe to delete - no other items reference this file
            await this.userFileService._removeUserFileById(ctx, att.fileId);
          } else {
            // File is still in use by other items, don't delete
            logger.info(`File ${att.fileId} not deleted during item deletion - still referenced by other items`);
          }
        }
      }
    } catch (e) {
      console.error('Error removing attachments', e);
    }

    await this.itemRepo.deleteWithId(itemId);
    return true;
  }

  async _listUserCollectionIdsWithPermissionType(userId: string, permissionFilterList = null) {
    const permissions = await this.permissionService._listDirectPermissionsForUserWithType(
      userId,
      ItemTypeEnum.collection,
    );
    if (!permissionFilterList || permissionFilterList.length == 0) return permissions.map((v) => v.itemId);
    else {
      permissionFilterList = permissionFilterList.filter((v) => v != '');
      return permissions.filter((v) => permissionFilterList.includes(v.permission)).map((v) => v.itemId);
    }
  }

  // ROUTE-METHOD
  // TODO: Clean up needed.
  // Doesn't get permissions correctly - missing owners
  // DON"T need this except for path?? - see listLibraryCollections
  // Note, targetUserId is only used for appending the parent PATH

  async listCollectionsById(
    ctx: RequestContext,
    targetUserId: string,
    ids = null,
    includePath = null,
    includeUserPermissions = null,
    allowListAll: boolean = false,
  ): Promise<Array<ItemInfoView>> {
    await ctx.verifyInAccount(targetUserId);

    let collections: Array<Item> = [];
    if (!ids) {
      if (allowListAll) {
        let collections: Array<Item> = [];
        collections = await this._getCollectionsForAccount(ctx.accountId);
        ids = collections.map((v) => v._id);
      } else throw new Error('No ids provided');
    } else {
      // NOTE: items can be cross-account (friends). Fetch globally, then filter by access.
      collections = await this.itemRepo.findWhereIdIn(ids);

      // Only collections.
      collections = (collections || []).filter((v) => v?.type == ItemTypeEnum.collection);

      // Filter by access (non-admin):
      // - Direct permission (including owner)
      // - Same-account discoverable (shared/network)
      // - Cross-account discoverable (network + friend/family relationship)
      if (!(await ctx.isAdmin())) {
        const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(targetUserId);

        const allowed: Item[] = [];
        for (const col of collections) {
          if (!col?._id) continue;

          // Direct permission always wins.
          const perm = (permissions as any)[col._id];
          if (perm && PermissionTypeList.includes(perm.permission)) {
            allowed.push(col);
            continue;
          }

          // Same-account visibility-derived access.
          if (col.accountId === ctx.accountId && (col.visibility === 'shared' || col.visibility === 'network')) {
            allowed.push(col);
            continue;
          }

          // Cross-account friend/family discoverability.
          if (col.visibility === 'network') {
            const ownerUserId = (col as any).userId;
            if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) {
              allowed.push(col);
              continue;
            }
          }

          // Public collections (if any) should be safe to show.
          if (col.visibility === 'public') {
            allowed.push(col);
            continue;
          }
        }

        collections = allowed;
      }

      // Reorder to match requested ids.
      const lookup = Object.fromEntries((collections || []).map((v) => [v._id, v]));
      collections = ids.map((id) => lookup[id]).filter((v) => !!v);
    }

    if (includeUserPermissions) {
      const permLookup = await this.permissionService._getPermissionLookupForAccountUsers(ctx.accountId, ids);

      for (const collection of collections) {
        collection['permList'] = permLookup[collection._id].map((v) => {
          return {
            userId: v.userId,
            permission: v.permission,
          };
        });
      }
    }

    collections = collections.filter((v) => v != null);

    let results: Array<ItemInfoView> = collections.map((v) => {
      return {itemId: v._id, details: v};
    });

    if (includePath) {
      for (const collectionData of results) {
        const pathTree = await this._getPathTree(ctx, targetUserId, collectionData.itemId);

        const pathItems = pathTree.map((v) => {
          return v.item;
        });
        collectionData.pathItems = pathItems;
      }
    }

    return results;
  }

  // ROUTE-METHOD
  // TODO: inefficient, gets all collections in account
  async listUserCollections(
    ctx: RequestContext,
    targetUserId: string,
    permissionFilterList = null,
    sharedOnly = false,
    includePath = false,
    includeUserPermissions = false,
    includeParents = false,
  ) {
    await ctx.verifyInAccount(targetUserId);

    //TODO: So inefficient
    //TODO: check current user permissions
    const targetUser = await ctx.getUserById(targetUserId);

    let isSelfOrUserAdmin = await ctx.isSelfOrAdminOfUser(targetUserId);

    if (!isSelfOrUserAdmin) {
      sharedOnly = true;
    }

    const userCollectionIds = await this._listUserCollectionIdsWithPermissionType(targetUserId, permissionFilterList);

    const colIdSet = new Set(userCollectionIds);
    const targetUserPermissionLookup =
      await this.permissionService._getUserDirectPermissionLookupExcludingOwner(targetUserId);

    // TODO: inefficient, gets all collections in account
    // TODO: Use join query with permissions
    // let collections = await this._getCollectionsForAccount(
    //   targetUser.accountId
    // );

    let collections: Item[] = await this._getItemsWithIdWhere(userCollectionIds, {
      accountId: targetUser.accountId,
      type: ItemTypeEnum.collection,
    });

    //TODO Should work as long as not too many collections in account. Could also use getByIds
    // collections = collections.filter((c) => colIdSet.has(c._id));
    if (sharedOnly) {
      collections = collections.filter((c) => c.visibility === 'shared' || c.visibility === 'network');
    }

    if (includeUserPermissions) {
      const allPermissionLookup = await this.permissionService._getPermissionLookupForAccountUsers(
        ctx.accountId,
        userCollectionIds,
      );
      for (const col of collections) {
        if (col._id != null && allPermissionLookup[col._id]) {
          let permDetailsList = allPermissionLookup[col._id];
          col['permList'] = permDetailsList.map((v) => {
            return {userId: v.userId, permission: v.permission};
          });
        }
      }
    }
    if (includeParents) {
      let parentList = await this.itemRepo
        .query()
        .from('item_relation')
        .whereIn('item_relation.itemId', userCollectionIds)
        .leftJoin('item', 'item_relation.collectionId', '=', 'item._id')
        .select('item.*', 'item_relation.itemId as childId');

      const parentMap = {};
      for (const parent of parentList) {
        if (!parentMap[parent.childId]) {
          parentMap[parent.childId] = [];
        }
        parentMap[parent.childId].push(parent);
      }
      for (const col of collections) {
        col['parents'] = parentMap[col._id] || [];
      }
    }
    //add user permission info to each collection
    for (const col of collections) {
      const permEntry = targetUserPermissionLookup[col._id];
      col['permission'] = permEntry?.permission;
      col['permissionUserId'] = permEntry?.userId;
    }

    let results: Array<ItemInfoView> = collections
      .filter((v) => v._id != null)
      .filter((v) => !v.archived)
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
        };
      });

    if (includePath) {
      for (const collectionData of results) {
        const pathTree = await this._getPathTree(ctx, targetUserId, collectionData.itemId);
        collectionData.pathItems = pathTree.map((v) => v.item);
      }
    }
    return results;
  }

  //------------------------
  //------- Item -----------
  //------------------------

  // ROUTE-METHOD
  public async getParentItemsForUser(ctx: RequestContext, targetUserId: string, itemId: string, includePath = null) {
    await ctx.verifyInAccount(targetUserId);

    return await this._getParentItemsForUser(ctx, targetUserId, itemId, includePath);
  }

  public async _getParentItemsForUser(ctx: RequestContext, targetUserId: string, itemId: string, includePath = null) {
    const colIds = await this.itemRelationService._getItemParentIdsForUser(ctx, targetUserId, itemId);
    if (!colIds) return null;

    const items = await this.listCollectionsById(ctx, targetUserId, colIds, includePath);

    return items;
  }

  //
  async __debugItem(itemId) {
    let item = await this.itemRepo.findById(itemId);

    let permissionsToItem = await this.permissionsRepo.findMany({
      itemId,
    });
    let permissions = permissionsToItem.map((v) => {
      return {
        userId: v.userId,
        permission: v.permission,
      };
    });

    console.log('Item Permissions', {permissionsToItem, permissions});
  }

  // ROUTE-METHOD
  // CONSOLIDATED: Now handles both items and collections with optional collection-specific params
  async getItemInfoById(
    ctx: RequestContext,
    itemId: string,
    detailsOnly = false,
    includeUserPermissions = false,
    includeFeedback = false,
  ): Promise<ItemInfoView> {
    if (!itemId) return null;

    const itemDetails = await ctx.getItemById(itemId);
    if (!itemDetails) {
      throw new Error('Item not found');
    }

    let isCollection = itemDetails.type == ItemTypeEnum.collection;
    const isAdmin = await ctx.isAdmin();

    const canViewCollectionByVisibilityOrNetwork = async (collectionId: string): Promise<boolean> => {
      if (isAdmin) return true;
      const col = await ctx.getItemById(collectionId);
      if (!col) return false;

      // Same-account "shared" and "network" are discoverable (family members).
      if (col.accountId === ctx.accountId && (col.visibility === 'shared' || col.visibility === 'network')) {
        return true;
      }

      // Cross-account discoverability only applies for network visibility.
      if (col.visibility === 'network') {
        const ownerUserId = col.userId;
        if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) {
          return true;
        }
      }

      return false;
    };

    const canViewItemViaVisibleAncestorCollection = async (): Promise<boolean> => {
      // If an item is contained in a collection the viewer can see, infer view permission.
      // This makes collection visibility transitive to its contents (items + nested collections).
      const maxDepth = 6;
      const maxNodes = 75;
      const visited = new Set<string>();

      // Start with direct parents.
      const initialParents = await this.itemRelationService._getParentRelationsForItem(itemId);
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

        // Direct permission to the collection (or admin) always grants view.
        const hasDirect = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, colId);
        if (hasDirect) return true;

        // Visibility-derived access to the collection grants view.
        if (await canViewCollectionByVisibilityOrNetwork(colId)) return true;

        if (depth >= maxDepth) continue;

        // Traverse up: parent collections of this collection (nested collections).
        const parents = await this.itemRelationService._getParentRelationsForItem(colId);
        const parentIds = (parents || [])
          .map((r) => r?.collectionId)
          .filter((v): v is string => typeof v === 'string' && v.length > 0);
        for (const pid of parentIds) {
          if (!visited.has(pid)) queue.push({colId: pid, depth: depth + 1});
        }
      }

      return false;
    };

    // Collection visibility rules:
    // - private: requires direct permission (or admin)
    // - shared: discoverable within the same account (family members)
    // - network: discoverable within the user's network (family + confirmed friends)
    let hasPerm =
      isCollection &&
      ((itemDetails.accountId === ctx.accountId &&
        (itemDetails.visibility === 'shared' || itemDetails.visibility === 'network')) ||
        (itemDetails.visibility === 'network' && (await ctx.isInNetwork(itemDetails.userId))) ||
        isAdmin);

    if (!hasPerm) hasPerm = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasPerm) {
      hasPerm = await canViewItemViaVisibleAncestorCollection();
    }

    if (!hasPerm) {
      throw new Error('No permission to view item');
    }

    //optimization
    if (detailsOnly && !includeUserPermissions && !includeFeedback) {
      return {
        itemId: itemDetails._id,
        details: itemDetails,
      };
    }

    const collectionRelations = await this.itemRelationService._getItemParentRelationsForUser(
      ctx,
      ctx.currentUserId,
      itemId,
    );
    // Backwards compatibility - derive collectionIds from collectionRelations
    const collectionIds = collectionRelations.map((r) => r.collectionId);

    const data: ItemInfoView = {
      itemId,
      collectionIds,
      collectionRelations,
      details: itemDetails,
      feedback: (await this.feedbackService._getItemFeedback(ctx.currentUserId, itemId)) as any,
    };

    // Collection-specific enrichment (merged from getCollectionById)
    if (includeUserPermissions) {
      const users = await this.permissionService._getPermissionsForItemIdWithUserInfo(ctx, itemId, true);

      data['permissions'] = users.map((v) => {
        return {
          userId: v.userId,
          permission: v.permission,
        };
      });

      // Set current user's permission on the item itself for client-side permission checks
      const currentUserPerm = users.find((u) => u.userId === ctx.currentUserId);
      if (currentUserPerm) {
        data.details.permission = currentUserPerm.permission as PermissionType;
        data.details.permissionUserId = ctx.currentUserId;
      } else if (itemDetails.userId === ctx.currentUserId) {
        // User owns the item
        data.details.permission = PermissionType.owner;
        data.details.permissionUserId = ctx.currentUserId;
      }
    } else {
      // Even without includeUserPermissions, set basic permission for owner
      if (itemDetails.userId === ctx.currentUserId) {
        data.details.permission = PermissionType.owner;
        data.details.permissionUserId = ctx.currentUserId;
      }
    }

    if (includeFeedback && !data.feedback) {
      const feedback = await this.feedbackService._getItemFeedbackForUser(ctx, itemId);
      data['feedback'] = feedback;
    }

    return data;
  }

  async listItemReactions(ctx: RequestContext, itemId: string): Promise<SharedItemReactionView[]> {
    await this.getItemInfoById(ctx, itemId, true, false, false);
    return await this.feedbackService.listItemReactions(itemId);
  }

  async _createItem(ctx: RequestContext, itemDetails: Item, assignDirectOwnerPermission: boolean = false) {
    if (itemDetails.type !== ItemTypeEnum.collection) {
      await this.assertCanCreateLibraryItem(ctx);
    }

    const now = new Date();

    if (!itemDetails.type) {
      throw new Error('Must provide type if creating new item');
    }
    const itemId = itemDetails.type == ItemTypeEnum.collection ? `col_${uuidv4()}` : `item_${uuidv4()}`;

    let encrypted = checkIfItemIsEncrypted(itemDetails);

    const itemUpdates = getSanitizedItemForSaving(itemDetails);

    if (itemUpdates?.encInfo != null && !hasValidEncInfoKeys((itemUpdates as any).encInfo)) {
      throw new Error('Invalid encInfo for item create: expected encInfo.keys[]');
    }

    if (itemUpdates?.encInfo != null && !payloadContainsCiphertext(itemUpdates)) {
      throw new Error('Refusing to create encrypted item without ciphertext payload');
    }

    const itemDetailsNew = {
      ...itemUpdates,
      _id: itemId,
      userId: ctx.currentUserId,
      accountId: ctx.accountId,
      createdAt: now,
      updatedAt: now,
      encrypted: encrypted,
    };

    await this.itemRepo.create(itemDetailsNew);

    try {
      await AuditLogService.instance.log(ctx, {
        action: itemDetails.type === ItemTypeEnum.collection ? 'collection.create' : 'item.create',
        entityType: itemDetails.type === ItemTypeEnum.collection ? 'collection' : 'item',
        entityId: itemId,
        relatedIds: {ownerUserId: ctx.currentUserId},
      });
    } catch (e) {
      console.error('audit_log: failed to log item.create', e);
    }

    // if (
    //   itemDetailsNew.type == ItemType.collection ||
    //   assignDirectOwnerPermission
    // ) {
    //   await this.permissionService._setUserPermission(
    //     ctx,
    //     ctx.currentUserId,
    //     itemId,
    //     PermissionType.owner,
    //     false
    //   );
    // }

    await this.changeLog.logLastUpdateForUsers([ctx.currentUserId], {
      type: 'itemUpdate',
      items: [itemId],
    });
    return itemId;
  }

  // ROUTE-METHOD
  async saveItem(ctx: RequestContext, saveRequest: SaveItemRequest): Promise<SaveItemResponse> {
    let {
      itemId,
      details,
      isNew,
      targetUserId,
      collectionIds = [],
      removeMissingCollections = false,
      quickShareUserIds = [],
      accessRequestId,
      feedbackUpdate,
    } = saveRequest;

    if (!details) {
      throw 'Failed to save item.';
    }

    let accessRequestRequesterId: string | null = null;
    if (accessRequestId) {
      const accessRequest = await this.accessRequestService._getAccessRequestById(ctx, accessRequestId);
      accessRequestRequesterId = accessRequest?.requesterId || null;
    }

    const overrideActorUserId = ctx.getTempAuthUserId() || ctx.getActingUserId() || null;
    const useAccessRequestOverrideFlow =
      !!accessRequestId &&
      ctx.isOverrideActive() &&
      !!overrideActorUserId &&
      !!accessRequestRequesterId &&
      overrideActorUserId !== accessRequestRequesterId;

    const sessionCtx =
      useAccessRequestOverrideFlow && overrideActorUserId
        ? ctx.cloneWithActingUser(overrideActorUserId, {
            tempAuthUserId: overrideActorUserId,
          })
        : ctx;

    const targetCtx =
      useAccessRequestOverrideFlow && accessRequestRequesterId
        ? ctx.cloneWithActingUser(accessRequestRequesterId, {
            tempAuthUserId: accessRequestRequesterId,
          })
        : ctx;

    const directTargetCreateCtx =
      !useAccessRequestOverrideFlow &&
      !!targetUserId &&
      targetUserId !== ctx.currentUserId
        ? ctx.cloneWithActingUser(targetUserId, {tempAuthUserId: null})
        : ctx;

    const noCollections = collectionIds == undefined || collectionIds.length == 0;

    if (!itemId || isNew) {
      if (!useAccessRequestOverrideFlow && targetUserId && targetUserId !== ctx.currentUserId) {
        await ctx.verifySelfOrAdmin(targetUserId);
      }

      itemId = await this._createItem(
        useAccessRequestOverrideFlow ? targetCtx : directTargetCreateCtx,
        details,
        noCollections,
      );
    } else {
      const updateCtx = useAccessRequestOverrideFlow
        ? await this.selectSaveItemUpdateContext(sessionCtx, targetCtx, itemId)
        : ctx;
      await this.updateItem(updateCtx, itemId, details);
    }

    const savedItem = await this.itemRepo.findById(itemId);
    const quickShareTargets =
      useAccessRequestOverrideFlow && savedItem?.userId
        ? quickShareUserIds.filter((userId) => userId && userId !== savedItem.userId)
        : quickShareUserIds;

    if (useAccessRequestOverrideFlow && quickShareTargets.length > 0) {
      await this.permissionService.shareItemWithUsers(sessionCtx, itemId, quickShareTargets);
    }

    if (!noCollections || removeMissingCollections) {
      const parentUpdateCtx = useAccessRequestOverrideFlow
        ? await this.selectSaveItemParentUpdateContext(
            sessionCtx,
            targetCtx,
            itemId,
            collectionIds,
            removeMissingCollections,
          )
        : ctx;

      await this.updateItemParents(parentUpdateCtx, itemId, collectionIds, removeMissingCollections);
    }

    if (accessRequestId) {
      await this.accessRequestService.processAccessRequest(
        useAccessRequestOverrideFlow ? sessionCtx : ctx,
        accessRequestId,
        'approved',
        null,
      );
    }

    if (!useAccessRequestOverrideFlow && quickShareUserIds && quickShareUserIds.length > 0)
      await this.permissionService.shareItemWithUsers(ctx, itemId, quickShareUserIds);

    let savedFeedback: ItemFeedbackView | undefined;

    if (feedbackUpdate) {
      await this.updateItemFeedbackValue(ctx, itemId, feedbackUpdate.attr, feedbackUpdate.value);

      const feedbackRow = await this.feedbackService._getItemFeedbackForUser(ctx, itemId);
      if (feedbackRow) {
        savedFeedback = getFeedbackData(feedbackRow);
      }
    }

    return {
      itemId,
      feedback: savedFeedback,
    };
  }

  private async selectSaveItemUpdateContext(sessionCtx: RequestContext, targetCtx: RequestContext, itemId: string) {
    if (sessionCtx === targetCtx) {
      return sessionCtx;
    }

    if (await this.permissionService._hasEditPermissionDirectOrAsAdmin(targetCtx, itemId)) {
      return targetCtx;
    }

    if (await this.permissionService._hasEditPermissionDirectOrAsAdmin(sessionCtx, itemId)) {
      return sessionCtx;
    }

    return targetCtx;
  }

  private async selectSaveItemParentUpdateContext(
    sessionCtx: RequestContext,
    targetCtx: RequestContext,
    itemId: string,
    collectionIds: string[],
    removeMissingCollections: boolean,
  ) {
    if (sessionCtx === targetCtx) {
      return sessionCtx;
    }

    if (await this.canUpdateItemParents(targetCtx, itemId, collectionIds)) {
      return targetCtx;
    }

    if (!removeMissingCollections && (await this.canUpdateItemParents(sessionCtx, itemId, collectionIds))) {
      return sessionCtx;
    }

    return targetCtx;
  }

  private async canUpdateItemParents(ctx: RequestContext, itemId: string, collectionIds: string[]) {
    const canEditItem = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
    if (!canEditItem) {
      return false;
    }

    for (const collectionId of collectionIds || []) {
      const canEditCollection = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, collectionId);
      if (!canEditCollection) {
        return false;
      }
    }

    return true;
  }

  // ROUTE-METHOD
  // TODO: Messy
  async updateItemParents(
    ctx: RequestContext,
    itemId: string,
    collectionIds: Array<string> = [],
    removeMissingCollections = true,
    skipNotifications = false,
    subscriptionUpdate = false,
    orderLookup = {},
  ) {
    if (!itemId) {
      throw 'Failed to save item.';
    }

    let item = await this.itemRepo.findById(itemId);

    let currColIds = await this.itemRelationService._getItemParentIdsForUser(ctx, ctx.currentUserId, itemId);

    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
    if (!hasPermission) {
      console.log('No permission to edit item (saveItemCollections)', itemId);
      throw new Error('No permission to edit item');
    }

    const currentUser = await ctx.getCurrentUser();
    if (!(await ctx.isAdmin())) {
      currColIds = await this.permissionService._filterToItemIdsWithPermissionForUser(
        currentUser?._id,
        currColIds,
        PermissionTypeEditableList,
      );
    }

    const toAddColIds = collectionIds.filter((a: string) => !currColIds.includes(a));
    console.log('toAddIds', toAddColIds, 'selectedIds', collectionIds);

    for (const cid of toAddColIds) {
      const order = orderLookup ? orderLookup[cid] : null;
      await this.itemRelationService._addItemToCollection(ctx, cid, itemId, item.type, order, subscriptionUpdate);
    }

    if (toAddColIds.length > 0) {
      const userData = currentUser.userData || {};
      let collectionIdHistory = userData['collectionIdHistory'] || [];
      collectionIdHistory = [...toAddColIds, ...collectionIdHistory].slice(0, 5);
      userData['collectionIdHistory'] = collectionIdHistory;
      await this.users.updateWithId(ctx.currentUserId, {userData});
    }

    let toRemoveIds = [];

    if (removeMissingCollections) {
      toRemoveIds = currColIds.filter((a) => !collectionIds.includes(a));
    }

    //Check whos effected
    const removeUserIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(ctx, [
      ...toRemoveIds,
    ]);

    if (toRemoveIds.length > 0) {
      for (const cid of toRemoveIds) {
        await this.itemRelationService.removeItemFromCollection(ctx, cid, itemId, subscriptionUpdate, true);
      }
    }

    const addUserIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(ctx, [
      ...toAddColIds,
    ]);

    await this.changeLog.logLastUpdateForUsers(Array.from(new Set([...addUserIds, ...removeUserIds])), {
      type: 'itemUpdate',
      items: [itemId],
    });

    //send notifications
    if (!skipNotifications) {
      for (const userId of addUserIds) {
        if (userId == ctx.currentUserId || item.type == ItemTypeEnum.collection) continue;
        const notificationData = {
          title: `You have a new item in you library!`,
          message: `<a href="/kindredapp/#/item/${itemId}">A new item</a> was added to a collection in your library by ${currentUser.username}.`,
          refInfo: {
            refId: itemId,
            refType: item.type,
          },
        };
        this.notificationsService.addUserNotification(
          ctx,
          NotificationType.NEW_ITEM,
          ctx.currentUserId,
          ctx.accountId,
          userId,
          notificationData,
        );
      }
    }

    return;
  }

  // ROUTE-METHOD
  async updateItemFeedbackValue(ctx: RequestContext, itemId: string, attrName: string, value: any) {
    const feedback = computeFeedbackUpdate(attrName, value);

    await this.feedbackService._updateItemFeedback(ctx.currentUserId, itemId, feedback);
    await this.evenLogService.recordEvent({
      eventName: EventRecordName.SAVE_ITEM_FEEDBACK,
      eventType: EventRecordType.EXPLICIT,
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
    });
    return feedback;
  }

  // ROUTE-METHOD
  async updateItem(
    ctx: RequestContext,
    itemId: string,
    itemDetails: Partial<Item>,
    options: {allowDecrypt: boolean; skipEncUpdate: boolean} = {
      allowDecrypt: false,
      skipEncUpdate: false,
    },
  ): Promise<void> {
    console.log('Updating item', itemId, itemDetails, options);

    // verify permission
    const hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasEditPermission) {
      console.log('No permission to edit item (updateItem)', itemId);

      throw new Error('No permission to edit item');
    }

    const now = new Date();
    let encrypted = checkIfItemIsEncrypted(itemDetails);

    const itemUpdates = getSanitizedItemForSaving(itemDetails);

    if (!options.allowDecrypt && itemUpdates?.encInfo != null && !hasValidEncInfoKeys((itemUpdates as any).encInfo)) {
      throw new Error('Invalid encInfo for updateItem: expected encInfo.keys[]');
    }

    // don't update encInfo because it might not be an encypted field, so who cares
    if (options.skipEncUpdate && !itemUpdates.encInfo) {
      const itemDetailsUpdate = {
        ...itemUpdates,
        updatedAt: now,
      };

      await this.itemRepo.updateWithId(itemId, itemDetailsUpdate);
    } else {
      // Server-side guardrail (payload-aware):
      // - If the update includes ciphertext, encInfo may legitimately change (rewrite).
      // - If the update does NOT include ciphertext, encInfo must not change in ways that could
      //   corrupt existing ciphertext (patch/metadata-only update).
      if (!options.allowDecrypt && itemUpdates.encInfo) {
        const currentItem = await this.itemRepo.findById(itemId);

        if (!currentItem?.encInfo && !payloadContainsCiphertext(itemUpdates)) {
          throw new Error('Refusing to attach encInfo to plaintext item without ciphertext rewrite');
        }

        if (currentItem?.encInfo) {
          assertEncInfoUpdateIsSafe({
            currentEncInfo: currentItem.encInfo,
            nextEncInfo: itemUpdates.encInfo,
            context: '/item/update',
            payloadForCiphertextCheck: itemUpdates,
          });
        }
      }

      // check to make sure we have encInfo if we are updating an encrypted item, otherwise we will remove encInfo which is find for decrypting
      if (!options.allowDecrypt && !itemUpdates.encInfo) {
        let currentItem = await this.itemRepo.findById(itemId);
        if (currentItem.encInfo) {
          throw new Error('Item is encrypted, cannot update without encInfo');
        }
      }

      const info = {
        ...itemUpdates,
        updatedAt: now,
        encrypted: encrypted,
      };

      await this.itemRepo.updateWithId(itemId, info);
    }

    //TODO: this may be redundent
    // update for all users who DIRECT have access to this item
    const userIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(ctx, [itemId]);

    await this.changeLog.logLastUpdateForUsers(userIds, {
      type: 'itemUpdate',
      items: [itemId],
    });
  }

  async archiveItemUpdate(ctx: RequestContext, itemId: string, value: boolean) {
    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      await this.itemRepo.updateWithId(itemId, {archived: value});
    }
  }

  // ROUTE-METHOD
  async addItemAttachment(ctx: RequestContext, itemId: string, attachment: ItemAttachment) {
    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const attachmentData = item.attachments || {entries: []};
      let attachments = attachmentData?.entries || [];

      // verify attachment has attributes
      const reqAttributes = ['id', 'type'];
      for (const attr of reqAttributes) {
        if (!attachment[attr]) {
          throw new Error(`Attachment missing required attribute: ${attr}`);
        }
      }

      // if exists, handle existing attachment
      const existingAttachment = attachments.find((a) => a.id == attachment.id);
      if (existingAttachment) {
        // Only delete the old file if we're replacing it with a different file
        // If fileIds match, we're updating the same file (don't delete it!)
        if (existingAttachment?.fileId && existingAttachment.fileId !== attachment.fileId) {
          try {
            // Check if any other items reference this fileId before deleting
            const itemsWithFile = await this.itemRepo.findItemsWithFileId(existingAttachment.fileId);
            const isFileUsedElsewhere = itemsWithFile.some((item) => item._id !== itemId);

            if (!isFileUsedElsewhere) {
              // Safe to delete - no other items reference this file
              await this.userFileService._removeUserFileById(ctx, existingAttachment.fileId);
            } else {
              // File is still in use by other items, don't delete
              logger.info(`File ${existingAttachment.fileId} not deleted - still referenced by other items`);
            }
          } catch (e) {
            console.error('Error removing old file', e);
          }
        }

        attachments = attachments.filter((a) => a.id != existingAttachment.id);
      }

      attachment.createDate = Date.now();
      attachments.push(attachment);
      attachmentData.entries = attachments;
      await this.itemRepo.updateWithId(itemId, {attachments: attachmentData});
      return attachment;
    }
  }

  // ROUTE-METHOD
  // Handles both legacy "attachment" and newer "attachmentInfo" upload flows.
  async addItemAttachmentViaUpload(
    ctx: RequestContext,
    itemId: string,
    attachment: any,
    attachmentInfo: any,
    encInfo: any,
    existingFileId?: string,
  ): Promise<{attachmentId: string; url?: string; fileId?: string}> {
    // Legacy path: caller provided a full ItemAttachment.
    if (attachment && (attachment as ItemAttachment).type && (attachment as ItemAttachment).id) {
      const att = attachment as ItemAttachment;
      const saved = await this.addItemAttachment(ctx, itemId, att);
      return {attachmentId: saved.id, fileId: saved.fileId};
    }

    if (!attachmentInfo) {
      throw new Error('Missing attachmentInfo');
    }

    const filename = String(attachmentInfo.filename || '');
    const fileType = String(attachmentInfo.fileType || '');
    const fileData = String(attachmentInfo.fileData ?? '');
    if (!filename) throw new Error('Missing attachmentInfo.filename');
    if (!fileType) throw new Error('Missing attachmentInfo.fileType');

    // Ensure the item exists and is editable (uploadFile also checks, but we need item data for attachment ID reuse).
    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
    if (!hasPermission) {
      throw new Error("User doesn't have permission to edit item");
    }

    const item = await this.itemRepo.findById(itemId);
    if (!item) throw new Error('Item not found');

    const existing = (item.attachments?.entries || []).find(
      (a: any) => a && a.type === 'file' && a.filename === filename && a.fileType === fileType,
    ) as ItemAttachment | undefined;

    const previews = [] as any[];
    if (attachmentInfo.imagePreview) {
      previews.push({id: 'default', type: attachmentInfo.imageType || 'image', data: attachmentInfo.imagePreview});
    }

    const uploaded = await this.userFileService.uploadFile(ctx, {
      ufId: existingFileId,
      refId: itemId,
      refType: 'item',
      filename,
      fileType,
      fileData,
      previews,
      encInfo: encInfo || attachmentInfo.encInfo || null,
    });

    const attachmentId = existing?.id || 'att_' + uuidv4();
    const newAttachment: ItemAttachment = {
      id: attachmentId,
      type: 'file',
      filename,
      fileType,
      fileId: uploaded?._id,
      meta: attachmentInfo.meta || undefined,
      info: attachmentInfo.objData || undefined,
      previews,
    };

    await this.addItemAttachment(ctx, itemId, newAttachment);
    return {attachmentId, fileId: uploaded?._id};
  }

  // ROUTE-METHOD
  async removeItemAttachment(ctx: RequestContext, itemId: string, id: string) {
    const hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasEditPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const attachmentData = item.attachments || {entries: []};
      const attachments = attachmentData.entries || [];

      const attachment = attachments.find((a) => a.id == id);

      if (attachment?.fileId) {
        try {
          // Check if any other items reference this fileId before deleting
          const itemsWithFile = await this.itemRepo.findItemsWithFileId(attachment.fileId);
          const isFileUsedElsewhere = itemsWithFile.some((item) => item._id !== itemId);

          if (!isFileUsedElsewhere) {
            // Safe to delete - no other items reference this file
            await this.userFileService._removeUserFileById(ctx, attachment.fileId);
          } else {
            // File is still in use by other items, don't delete
            logger.info(`File ${attachment.fileId} not deleted - still referenced by other items`);
          }
        } catch (e) {
          console.error('Error removing file', e);
        }
      }
      const newAttachments = attachments.filter((a) => a.id != id);
      attachmentData.entries = newAttachments;
      await this.itemRepo.updateWithId(itemId, {attachments: attachmentData});
    }
  }

  // ROUTE-METHOD
  async renameItemAttachment(ctx: RequestContext, itemId: string, attachmentId: string, filename: string) {
    const hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

    if (!hasEditPermission) {
      throw new Error("User doesn't have permission to edit item");
    }

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const attachmentData = item.attachments || {entries: []};
    const attachments = attachmentData.entries || [];

    const attachment: any = attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Update the filename
    attachment.filename = filename;

    await this.itemRepo.updateWithId(itemId, {attachments: attachmentData});

    return {success: true};
  }
}

export default ItemService;
