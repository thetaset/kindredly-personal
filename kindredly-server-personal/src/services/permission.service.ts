import {config} from '@/config';
import {KEY_DIL} from '@/templates/email.templates';

import {ItemRepo} from '@/db/item.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import {UserRepo} from '@/db/user.repo';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';
import {UserPermRepo} from '@/db/user_perm.repo';
import Item from 'tset-sharedlib/schemas/public/Item';
import User from 'tset-sharedlib/schemas/public/User';
import {NotificationType} from '@/typing/enum_strings';
import {removeExtraDetailsFromUser} from '@/utils/auth_utils';
import {
  ItemPermissionDetails,
  ItemTypeEnum,
  PermissionType,
  PermissionTypeEditableList,
  PermissionTypeList,
  UserType,
  UserPermissionRecord,
} from 'tset-sharedlib/shared.types';
import NotificationService from './notification.service';
import {RequestContext} from '../base/request_context';
import {container} from '@/inversify.config';
import {AuditLogService} from './audit_log.service';

// interface ItemPermissionDetails {
//   userId: string;
//   itemId: string;
//   username?: string;
//   permission: PermissionType;
//   direct?: boolean;
//   inheritedFrom?: Array<string>;
//   inheritedFromUsers?: Array<string>;
// }

// interface UserPermissionRecord {
//   userId: string;
//   username: string;
//   permission: PermissionType;
//   permissionDetails: ItemPermissionDetails;
//   user: User;
// }

export interface UserPermWithDetails {
  userId: string;
  username: string;
  displayedName: string;
  permission: PermissionType;
  permissionDetails: ItemPermissionDetails;
  profileImage?: string;
  pinned?: boolean;
}

class PermissionService {
  private changeLog = new UserChangeLogRepo();
  private itemRelations = new ItemRelationRepo();
  private itemRepo = new ItemRepo();
  private notificationsService = container.resolve(NotificationService);
  private permissions = new UserPermRepo();
  private users = new UserRepo();
  private itemFeedbackRepo = new ItemFeedbackRepo();

  //------------------------
  //----User Permissions----
  //------------------------

  createPermissionKey(userId: string, itemId: string) {
    return `${userId}${KEY_DIL}${itemId}`;
  }

  async _getUserDirectPermissionLookupExcludingOwner(userId: string) {
    return Object.fromEntries((await this._listDirectPermissionsForUser(userId)).map((v) => [v.itemId, v]));
  }

  async _listDirectPermissionsForUser(userId: string) {
    const q = this.itemRepo
      .query()

      .from('user_perm')
      .leftJoin('item', 'item._id', 'user_perm.itemId')
      .where('user_perm.userId', userId)
      .select('user_perm.*');
    let permList1 = await q;

    const q2 = this.itemRepo
      .query()
      .from('item')
      .where({'item.userId': userId} as any)
      .select('item._id as itemId')
      .then((items) =>
        items.map((item) => ({
          userId,
          itemId: item.itemId,
          permission: 'owner',
        })),
      );
    let permList2 = await q2;

    return [...permList1, ...permList2];
  }

  async _listDirectPermissionsForUserWithType(userId: string, type: ItemTypeEnum) {
    const q = this.itemRepo
      .query()

      .from('user_perm')
      .leftJoin('item', 'item._id', 'user_perm.itemId')
      .where('user_perm.userId', userId)
      .where('item.type', type)
      .select('user_perm.*');
    let permList1 = await q;

    const q2 = this.itemRepo
      .query()
      .from('item')
      .where({'item.userId': userId} as any)
      .where('item.type', type)
      .select('item._id as itemId')
      .then((items) =>
        items.map((item) => ({
          userId,
          itemId: item.itemId,
          permission: 'owner',
        })),
      );
    let permList2 = await q2;

    return [...permList1, ...permList2];
  }

  async _setUserPermissionList(ctx: RequestContext, targetUserId: string, permissions: Record<string, any>) {
    // check for owner
    Object.values(permissions).forEach((v) => {
      if (v.permission == PermissionType.owner) {
        throw Error('Cannot assign ownership this way, must reassign with ownership transfer first');
      }
    });

    const currentPermissions = await this._listDirectPermissionsForUser(targetUserId);
    const currentItemIdSet = new Set(currentPermissions.map((v) => v.itemId));

    const updatedIds = [];
    for (const [itemId, value] of Object.entries<any>(permissions)) {
      if (!currentItemIdSet.has(itemId)) {
        updatedIds.push(itemId);
      }
      await this._setUserPermission(ctx, targetUserId, itemId, value.permission);
    }
  }

  async _listAllDirectPermissionsForAllUsersPermissionToItem(itemId: string) {
    let item = await this.itemRepo.findById(itemId);

    let permissions = [
      {
        userId: item.userId,
        itemId: itemId,
        permission: PermissionType.owner,
      },
    ];
    return [...permissions, ...(await this.permissions.findMany({itemId}))];
  }

  async _listUserIdsOfAllUserWithDirectPermissionsToItems(ctx: RequestContext, itemIds: Array<string>) {
    const userIds = new Set<string>();
    for (const id of itemIds) {
      const permissions = await this._listAllDirectPermissionsForAllUsersPermissionToItem(id);
      for (const perm of permissions) {
        if (perm.userId) userIds.add(perm.userId);
      }
    }
    return Array.from(userIds);
  }

  async _filterToItemIdsWithPermissionForUser(userId: string, itemIds: string[], permList: string[]) {
    const q = this.itemRepo
      .query()
      .from('user_perm')
      .where('user_perm.userId', userId)
      .whereIn('user_perm.itemId', itemIds)
      .whereIn('user_perm.permission', permList)
      .select('user_perm.itemId');
    return await q;
  }

  // ROUTE-METHOD
  public async getUserPermissionLookup(ctx: RequestContext, userId: string) {
    await ctx.verifyInAccount(userId);
    return await this._getUserDirectPermissionLookupExcludingOwner(userId);
  }

  private async _listAllUserDirectPermissionRecordsForMultipleUsers(userIds: Array<string>) {
    let itemIdOwnerIdPairs = await this.itemRepo.findWhereIn('userId', userIds).select('item.*');

    let ownerPermissions = itemIdOwnerIdPairs.map((v) => {
      return {
        itemId: v._id,
        userId: v.userId,
        permission: PermissionType.owner,
      };
    });

    let assignPermissions = await this.permissions.findWhereIn('userId', userIds);

    return [...assignPermissions, ...ownerPermissions];
  }

  async _listUserPermissionsToItems(ctx: RequestContext, itemId: string, skipAccessCheck = false) {
    let lookup = await this._getPermissionLookupForItem(ctx, itemId, skipAccessCheck);
    return Object.values(lookup);
  }

  // used for library items
  async _listUserIdsWithPermissionsToItem(ctx: RequestContext, itemId: string, skipAccessCheck = false) {
    let lookup = await this._getPermissionLookupForItem(ctx, itemId, skipAccessCheck);
    return Object.keys(lookup);
  }

  // not efficient
  // Used to add permissions to outgoing data
  // TODO: Maybe have duplicates??!
  // TODO: replace this with something better
  async _getPermissionLookupForAccountUsers(
    accountId: string,
    ids: string[],
  ): Promise<Record<string, UserPermWithDetails[]>> {
    const users = await this.users.listByAccountId(accountId);

    const permissionUserMap = Object.fromEntries(users.map((v) => [v._id, []]));

    const userPermissions = await this._listAllUserDirectPermissionRecordsForMultipleUsers(users.map((v) => v._id));
    userPermissions.forEach((v) => {
      permissionUserMap[v.userId].push(v);
    });

    const permLookup = {};
    const idSet = new Set(ids);
    for (const u of users) {
      const pinnedSet = new Set((u.pinnedItemIds as Array<string>) || []);
      const permArray = permissionUserMap[u._id];
      for (const perm of permArray) {
        if (!idSet.has(perm.itemId)) continue;

        if (!(perm.itemId in permLookup)) permLookup[perm.itemId] = [];

        permLookup[perm.itemId].push({
          userId: u._id,
          username: u.username,
          displayedName: u.displayedName,
          profileImage: u.profileImage,
          permission: perm.permission,
          pinned: pinnedSet.has(perm.itemId),
        } as UserPermWithDetails);
      }
    }
    return permLookup;
  }

  async _getPermissionsForItemIdWithUserInfo(
    ctx: RequestContext,
    itemId: string,
    skipAccessCheck = false,
  ): Promise<UserPermWithDetails[]> {
    let permissions = await this._getPermissionLookupForItem(ctx, itemId, skipAccessCheck);

    let userPerms = [];

    const users = await this.users.listByAccountId(ctx.accountId);
    let userLookup = Object.fromEntries(users.map((v) => [v._id, v]));

    for (const userId in permissions) {
      if (userId in userLookup) {
        let user = userLookup[userId];
        const pinnedSet = new Set((user.pinnedItemIds as Array<string>) || []);

        let perm = permissions[userId];
        userPerms.push({
          userId: user._id,
          username: user.username,
          displayedName: user.displayedName,
          permission: perm.permission,
          permissionDetails: perm,
          profileImage: user.profileImage,
          pinned: pinnedSet.has(perm.itemId),
        });
      }
    }

    return userPerms;
  }

  // make sure to assign owner in permLookup first
  // owner comes from item record (userId)
  private async _populatePermissionsAssignedDirectlyExcludingOwner(
    itemId: string,
    permLookup: Record<string, ItemPermissionDetails>,
  ) {
    const directPermissions = await this.permissions.findMany({itemId});

    for (const perm of directPermissions) {
      if (perm.userId in permLookup) {
        const existing = permLookup[perm.userId];
        if (existing.permission === PermissionType.owner) {
          permLookup[perm.userId] = {
            ...existing,
            direct: true,
            notInLibrary: perm.notInLibrary ?? existing.notInLibrary,
            sharedByUserId: existing.sharedByUserId ?? perm.sharedByUserId ?? undefined,
          };
        }
        continue;
      }

      permLookup[perm.userId] = {...perm, direct: true, inheritedFrom: []};
    }
  }

  // NOTE Should not be used for collections (collections don't inherit permissions)
  private async ___listPermissionInheritedFromParentCollection(
    itemId: string,
  ): Promise<{itemId: string; userId: string; permission: string}[]> {
    const q = this.itemRelations
      .query()
      .from('item_relation')
      .leftJoin('user_perm', 'user_perm.itemId', 'item_relation.collectionId')
      .leftJoin('item', 'item._id', 'item_relation.collectionId')
      .where('item_relation.itemId', itemId)
      .select('user_perm.*', 'item._id as collectionId ', 'item.userId as ownerId', 'item.createdAt as ownerCreatedAt');

    const parentPermissions = await q;
    let resultPerms = [];
    let ownerInfo = parentPermissions.find((perm) => !!perm.ownerId);
    if (ownerInfo) {
      resultPerms.push({
        userId: ownerInfo.ownerId,
        permission: PermissionType.owner,
        itemId: ownerInfo.collectionId,
      });
    }

    for (const perm of parentPermissions) {
      if (!!perm.userId) {
        resultPerms.push({
          userId: perm.userId,
          permission: perm.permission,
          itemId: perm.collectionId,
        });
      }
    }

    return resultPerms;
  }

  private async _populatePermissionsInheritedFromParentCollections(
    itemId: string,
    permLookup: Record<string, ItemPermissionDetails>,
  ) {
    let inheritedPermissions = await this.___listPermissionInheritedFromParentCollection(itemId);

    for (const perm of inheritedPermissions) {
      if (perm.userId in permLookup) {
        let existingPerm = permLookup[perm.userId];
        if (existingPerm.direct) {
          console.log('Already has direct permission, skipping inherited permission', perm.userId);
          continue;
        }
        let inheritedFrom = existingPerm.inheritedFrom || [];
        inheritedFrom.push(perm.itemId);
        existingPerm.inheritedFrom = inheritedFrom;
        if (existingPerm.permission == PermissionType.viewer && perm.permission == PermissionType.editor) {
          existingPerm.permission = PermissionType.editor;
        }
        permLookup[perm.userId] = existingPerm;
      } else {
        //can't inherit owner permission
        let permission = perm.permission == PermissionType.viewer ? PermissionType.viewer : PermissionType.editor;
        permLookup[perm.userId] = {
          userId: perm.userId,
          itemId: itemId,
          direct: false,
          inheritedFrom: [perm.itemId],
          permission: permission,
        };
      }
    }
  }

  private async _populatePermissionsInheritedAsAdmin(
    ctx: RequestContext,
    permLookup: Record<string, ItemPermissionDetails>,
  ) {
    if (await ctx.isAdmin()) {
      let managedUserIds = new Set(await ctx.getManagedUserIds());
      for (const managedUserId of managedUserIds) {
        if (managedUserId in permLookup) {
          let managedPerm = permLookup[managedUserId];

          if (!(ctx.currentUserId in permLookup)) {
            let perm: ItemPermissionDetails = {
              userId: ctx.currentUserId,
              itemId: managedPerm.itemId,
              // Admins are allowed to manage any item/collection visible in a managed (restricted) user's library.
              // Even if the managed user only has viewer access, the admin should still be able to edit.
              permission: PermissionType.editor,
              inheritedFromUsers: [managedUserId],
              direct: false,
            };
            permLookup[ctx.currentUserId] = perm;
          } else {
            let perm = permLookup[ctx.currentUserId];
            let inheritedFromUsers = perm.inheritedFrom || [];
            inheritedFromUsers.push(managedUserId);
            perm.inheritedFromUsers = inheritedFromUsers;
            if (perm.permission !== PermissionType.editor) perm.permission = PermissionType.editor;

            permLookup[ctx.currentUserId] = perm;
          }
        }
      }
    }
  }

  // ROUTE-METHOD
  async listPermissionsToItemWithUserDetails(ctx: RequestContext, itemId: string, skipAccessCheck = false) {
    try {
      return await this._listUserPermissionsToItemWithUserDetails(ctx, itemId, skipAccessCheck);
    } catch (e) {
      return [];
    }
  }

  // ROUTE-METHOD
  // TODO: why together
  async listPermissionsAndReactions(ctx: RequestContext, itemId: string) {
    const userPermissions = await this.listPermissionsToItemWithUserDetails(ctx, itemId);
    const accountUserIds = userPermissions.map((v) => v.userId);
    const feedback = await this.itemFeedbackRepo.findWhereItemIdWithUsersIn(itemId, accountUserIds);

    const reactions = feedback.map((v) => {
      return {
        userId: v.userId,
        itemId: v.itemId,
        reaction: v.reaction,
      };
    });

    return {permissions: userPermissions, reactions: reactions};
  }

  // OK
  async _getDirectPermissionLookupForItemIdsExcludingOwner(
    userId: string,
    itemIds: string[],
  ): Promise<Record<string, any>> {
    const permissionIds = itemIds.map((v) => this.createPermissionKey(userId, v));
    const permEntries = await this.permissions.findWhereIn('_id', permissionIds);
    return Object.fromEntries(permEntries.map((v) => [v.itemId, v]));
  }

  // OK for collections
  async _getDirectUserPermissionToItemOrCollectionExcludingOwner(
    userId: string,
    itemId: string,
  ): Promise<PermissionType> {
    const entry = await this.permissions.findById(this.createPermissionKey(userId, itemId));
    return entry?.permission;
  }

  // OK
  async _hasPermissionAndInLibrary(
    ctx: RequestContext,
    itemId: string,
    validPermissions: PermissionType[],
  ): Promise<boolean> {
    return await this._hasPermissionDirectlyOrAsAdmin(ctx, itemId, validPermissions, false);
  }

  async _hasEditPermissionForCollection(ctx: RequestContext, collectionId: string): Promise<boolean> {
    return await this._hasPermissionDirectlyOrAsAdmin(ctx, collectionId, PermissionTypeEditableList, false);
  }

  async _hasEditPermissionDirectOrAsAdmin(ctx: RequestContext, itemId: string): Promise<boolean> {
    return await this._hasPermissionDirectlyOrAsAdmin(ctx, itemId, PermissionTypeEditableList, true);
  }

  async _hasSharePermissionDirectOrAsAdmin(ctx: RequestContext, itemId: string): Promise<boolean> {
    return await this._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
  }

  async _hasAnyPermissionDirectOrAsAdmin(ctx: RequestContext, itemId: string): Promise<boolean> {
    return await this._hasPermissionDirectlyOrAsAdmin(ctx, itemId, PermissionTypeList, true);
  }

  async isInLibraryForUser(ctx: RequestContext, targetUserId: string, itemId: string): Promise<boolean> {
    const permLookup = await this._getPermissionLookupForItem(ctx, itemId, true, true);
    const entry = (permLookup as any)?.[targetUserId] as any;
    if (!entry) return false;
    return entry?.notInLibrary !== true;
  }

  // OK
  // TODO: nearly same as : _getUserPermissionToItemLookup but serve differnt purposes - find way to combine
  async _hasPermissionDirectlyOrAsAdmin(
    ctx: RequestContext,
    itemId: string,
    validPermissions: PermissionType[],
    includeOutsideLibrary = true,
  ): Promise<boolean> {
    // first check direct permissions
    const userPerm = await this._getDirectUserPermissionToItemOrCollectionExcludingOwner(ctx.currentUserId, itemId);

    if (userPerm && validPermissions.includes(userPerm)) return true;

    const item = await ctx.getItemById(itemId);
    if (!item) {
      console.error('Item not found:', itemId);
      return false;
    }

    const permLookup = {};

    if (item?.userId)
      permLookup[item.userId] = {userId: item.userId, itemId: itemId, permission: PermissionType.owner, direct: true};

    await this._populatePermissionsAssignedDirectlyExcludingOwner(itemId, permLookup);

    if (item.type != ItemTypeEnum.collection) {
      await this._populatePermissionsInheritedFromParentCollections(itemId, permLookup);
    }

    // Note: these are outside the library and for admin only
    if (includeOutsideLibrary && (await ctx.isAdmin())) {
      await this._populatePermissionsInheritedAsAdmin(ctx, permLookup);
    }

    if (ctx.currentUserId in permLookup) {
      let entry = permLookup[ctx.currentUserId];
      const hasPerm = validPermissions.includes(entry.permission);
      return hasPerm;
    } else return false;
  }

  // TODO: nearly same as : _hasPermissionDirectOrIndirect but serve differnt purposes
  async _getPermissionLookupForItem(
    ctx: RequestContext,
    itemId: string,
    skipAccessCheck = false,
    keepAdminPerms = false,
  ): Promise<Record<string, ItemPermissionDetails>> {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      console.error("Item doesn't exist during permission lookup:", itemId);
      return {};
    }

    const permLookup = {};
    if (item?.userId)
      permLookup[item.userId] = {userId: item.userId, itemId: itemId, permission: PermissionType.owner, direct: true};

    await this._populatePermissionsAssignedDirectlyExcludingOwner(itemId, permLookup);

    //check inherited permissions if item is not a collection
    if (item.type != ItemTypeEnum.collection) {
      await this._populatePermissionsInheritedFromParentCollections(itemId, permLookup);
    }

    //check if current user should be able to access this info
    if ((await ctx.isAdmin()) && !skipAccessCheck && !(ctx.currentUserId in permLookup)) {
      let noAccess = true;

      //if admin, check if item is in account
      await this._populatePermissionsInheritedAsAdmin(ctx, permLookup);
      noAccess = !(ctx.currentUserId in permLookup);

      if (noAccess) {
        console.error("You don't have permission to request this info", ctx.currentUserId);
        throw new Error("You don't have permission to request this info");
      } else {
        // remove currentUserAt this point because its only their to see if it should be able to access this info

        if (!keepAdminPerms) delete permLookup[ctx.currentUserId];
      }
    }
    return permLookup;
  }

  //TODO: need to handle situation where user is owner of an item, but it is in a collection they don't own
  async _listUserPermissionsToItemWithUserDetails(
    ctx: RequestContext,
    itemId: string,
    skipAccessCheck = false,
  ): Promise<UserPermissionRecord[]> {
    const permLookup = await this._getPermissionLookupForItem(ctx, itemId, skipAccessCheck);
    const userIds = Object.keys(permLookup);

    //attach user info
    const userPermissions = (await this.users.findWhereIn('_id', userIds))
      .filter((v) => !!v && !v.deleted)
      .map((v) => {
        return {
          userId: v._id,
          username: v.username,
          permission: permLookup[v._id].permission,
          notInLibrary: !!permLookup[v._id]?.notInLibrary,
          permissionDetails: permLookup[v._id],
          user: removeExtraDetailsFromUser(v),
        };
      });

    return userPermissions;
  }

  // ROUTE-METHOD
  async setUserPermission(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string,
    permission = PermissionType.editor,
  ) {
    await ctx.verifyAdminPermissions(targetUserId);

    if (!(await this._hasEditPermissionDirectOrAsAdmin(ctx, itemId))) {
      throw Error('User does not have permission to edit this item');
    }

    await this._setUserPermission(ctx, targetUserId, itemId, permission);
  }

  //needs cleaned up, some not good stuff in here
  async _setUserPermission(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string,
    permission = PermissionType.editor,
    dontOverride = false,
    allowCrossAccountShare = false,
    notInLibrary = false,
  ) {
    if (!itemId) {
      throw 'Item id not specified';
    }

    const permId = this.createPermissionKey(targetUserId, itemId);
    const permissionEntry = await this.permissions.findById(permId);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw `Item ${itemId} not found`;
    }

    const isCurrentOwner = item && item.userId && item.userId == targetUserId;

    if (isCurrentOwner && targetUserId == ctx.currentUserId) {
      throw `Owner cannot assigned new permission this way, must reassign with ownership transfer first`;
    }

    if (permission == PermissionType.owner) {
      throw `Cannot assign ownership this way, must reassign with ownership transfer first`;
    }

    // Generic cross-account permission writes stay blocked unless the caller is the
    // validated friend-share path, which has already enforced network + ownership rules.
    let isCrossAccountShare = false;
    try {
      const targetUser = await ctx.getUserById(targetUserId);
      if (targetUser?.accountId && targetUser.accountId !== ctx.accountId) isCrossAccountShare = true;
    } catch {
      // If user lookup fails, fall through to existing behavior.
    }

    if (isCrossAccountShare && !allowCrossAccountShare) {
      throw new Error('Cross-account permissions are disabled. Use network visibility sharing instead.');
    }

    if (!!permissionEntry && dontOverride) {
      console.log('Permission entry:', permissionEntry, 'already exists, not overriding');
      return;
    }

    const info = {
      _id: permId,
      userId: targetUserId,
      itemId: itemId,
      permission: permission,
      sharedByUserId: ctx.currentUserId,
      notInLibrary,
    };

    await this.permissions.create(info);
    await this.changeLog.logLastUpdateForUsers([targetUserId], {type: 'itemUpdate', items: [itemId]});
  }

  async _removeUserPermission(userId: string, itemId: string) {
    try {
      const id = this.createPermissionKey(userId, itemId);
      await this.permissions.deleteWithId(id);
    } catch (e) {
      // allow this to file since owner permissions are not stored in the same table
    }
  }

  async transferOwnership(ctx: RequestContext, targetUserId: string, itemId: string) {
    return await this._assignItemOwner(ctx, targetUserId, itemId, false);
  }

  // current user must have edit permission to item
  async _assignItemOwner(ctx: RequestContext, targetUserId: string, itemId: string, force = false) {
    let newOwnerId = targetUserId;
    await ctx.verifyInAccount(newOwnerId);

    const item = await ctx.getItemById(itemId);
    if (!item) {
      throw Error('Item not found');
    }
    const hasEditPermission = await this._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
    if (!hasEditPermission) {
      throw Error("User doesn't have permission to transfer ownership of this item");
    }

    let oldOwnerId = item.userId;

    // fix to check if admin should be able to transfer ownership
    if (hasEditPermission || force) {
      const tx = await this.itemRepo.createTransaction();

      let txItemRepo = new ItemRepo().withTransaction(tx);
      let txPermission = new UserPermRepo().withTransaction(tx);

      // update item owner
      await txItemRepo.updateOwner(itemId, newOwnerId);

      // remove new owners old permission
      let currentUserPermissionId = this.createPermissionKey(newOwnerId, itemId);
      let currentUserPermission = await txPermission.findById(currentUserPermissionId);
      if (currentUserPermission) {
        await txPermission.deleteWithId(currentUserPermissionId);
      }

      // set old owner permission
      let currentOwnerUpdatedPerm = {
        _id: this.createPermissionKey(oldOwnerId, itemId),
        userId: oldOwnerId,
        itemId: itemId,
        permission: PermissionType.editor,
      };
      await txPermission.create(currentOwnerUpdatedPerm);
      tx.commit();

      try {
        await AuditLogService.instance.log(ctx, {
          action: 'ownership.transfer',
          entityType: item.type === ItemTypeEnum.collection ? 'collection' : 'item',
          entityId: itemId,
          relatedIds: {oldOwnerUserId: oldOwnerId, newOwnerUserId: newOwnerId},
        });
      } catch (e) {
        console.error('audit_log: failed to log ownership.transfer', e);
      }

      if (ctx.currentUserId != targetUserId) {
        //only if newly added to permissions
        this._sendShareNotification(ctx, targetUserId, item).catch((e) => {
          console.error('Error sending share notification', e);
        });
      }
    }

    return true;
  }

  // ROUTE-METHOD
  async updateItemPermissions(ctx: RequestContext, itemId: string, permissionUpdates: any[]) {
    const item = await this.itemRepo.findById(itemId);
    if (!item) throw Error('item not found');

    // allow user to remove from library if they admin
    let isJustSelfRemove = false;
    if (
      (await ctx.isAdmin()) &&
      permissionUpdates.length == 1 &&
      permissionUpdates[0].userId == ctx.currentUserId &&
      (!permissionUpdates[0].permission || permissionUpdates[0].permission == 'REMOVE')
    ) {
      const permUpdate = permissionUpdates[0];
      if (permUpdate.userId == ctx.currentUserId && (!permUpdate.permission || permUpdate.permission == 'REMOVE'))
        isJustSelfRemove = true;
    }

    if (!isJustSelfRemove) {
      const hasPermission = await this._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

      if (!hasPermission) {
        throw Error("User doesn't have permission");
      }
    }

    const existingPermissions = await this._listAllDirectPermissionsForAllUsersPermissionToItem(itemId);
    const currentPermissionsMap = Object.fromEntries(existingPermissions.map((v) => [v.userId, v]));

    for (const entry of permissionUpdates) {
      if (!entry.permission || entry.permission == 'REMOVE') {
        await this._removeUserPermission(entry.userId, itemId);

        try {
          await AuditLogService.instance.log(ctx, {
            action: 'permission.remove',
            entityType: item.type === ItemTypeEnum.collection ? 'collection' : 'item',
            entityId: itemId,
            relatedIds: {targetUserId: entry.userId},
          });
        } catch (e) {
          console.error('audit_log: failed to log permission.remove', e);
        }
      } else {
        const newPermissions = {};
        newPermissions[itemId] = {
          id: itemId,
          permission: entry.permission,
        };
        await this._setUserPermissionList(ctx, entry.userId, newPermissions);

        try {
          await AuditLogService.instance.log(ctx, {
            action: 'permission.set',
            entityType: item.type === ItemTypeEnum.collection ? 'collection' : 'item',
            entityId: itemId,
            relatedIds: {targetUserId: entry.userId},
          });
        } catch (e) {
          console.error('audit_log: failed to log permission.set', e);
        }
        if (!(entry.userId in currentPermissionsMap && ctx.currentUserId != entry.userId)) {
          //only if newly added to permissions
          this._sendShareNotification(ctx, entry.userId, item).catch((e) => {
            console.error('Error sending share notification', e);
          });
        }
      }
    }
  }

  // ROUTE-METHOD
  async shareItemWithUsers(
    ctx: RequestContext,
    itemId: string,
    targetUserIds: string[],
    permission = PermissionType.editor,
    skipFeedEntry = false,
    viewerIfRestricted = false,
    notInLibrary = false,
    forceViewerForCrossAccount = false,
    allowSameAccountNonAdminShare = false,
  ) {
    if (!targetUserIds || targetUserIds.length == 0) return;

    await ctx.verifyInNetwork(targetUserIds);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw Error('Item not found');
    }
    // check permission to item
    const hasPermission = await this._hasSharePermissionDirectOrAsAdmin(ctx, itemId);
    if (!hasPermission) {
      throw Error("User doesn't have permission to share this item");
    }

    for (const targetUserId of targetUserIds) {
      if (targetUserId && targetUserId != ctx.currentUserId)
        await this._shareItemWithUser(
          ctx,
          targetUserId,
          item,
          permission,
          skipFeedEntry,
          viewerIfRestricted,
          notInLibrary,
          forceViewerForCrossAccount,
          allowSameAccountNonAdminShare,
        );
    }
  }

  async _shareItemWithUser(
    ctx: RequestContext,
    targetUserId: string,
    item: Item,
    permission: PermissionType,
    skipFeedEntry = false,
    viewerIfRestricted = false,
    notInLibrary = false,
    forceViewerForCrossAccount = false,
    allowSameAccountNonAdminShare = false,
  ) {
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('Target user not found');
    }

    const isTargetInSameAccount = targetUser.accountId === ctx.accountId;
    if (isTargetInSameAccount) {
      await ctx.verifyInAccount(targetUserId);

      if (!(await ctx.isAdmin()) && targetUser.type != UserType.admin && !allowSameAccountNonAdminShare) {
        console.error(
          `Only admins can share with other non admin users user (not throwing error, just skipping). CurrentUser: ${ctx.currentUserId}, Item: ${item._id}, user: ${targetUserId}`,
        );
        return;
      }

      if (viewerIfRestricted && targetUser.type != UserType.restricted) {
        permission = PermissionType.viewer;
      }
    } else {
      // Friend share (cross-account)
      // IMPORTANT: Never allow a user to re-share content that belongs to a different account.
      // Cross-account sharing must only be initiated for content that is owned within the sharer's account.
      // This prevents accidentally (or maliciously) adding permissions/keys to a friend's content.
      await ctx.verifyInAccount(item.userId, 'You can only share an item with friends if it belongs to your account');

      if (permission === PermissionType.owner) {
        throw new Error('Friend sharing cannot grant ownership');
      }

      if (forceViewerForCrossAccount) {
        permission = PermissionType.viewer;
      }
    }

    await this._setUserPermission(
      ctx,
      targetUserId,
      item._id,
      permission || PermissionType.editor,
      true,
      !isTargetInSameAccount,
      notInLibrary,
    );

    this._sendShareNotification(ctx, targetUserId, item).catch((e) => {
      console.error('Error sending share notification', e);
    });
  }

  async _sendShareNotification(ctx: RequestContext, targetUserId: string, item: Item) {
    const currentUser = await ctx.getCurrentUser();
    const targetUser = await ctx.getUserById(targetUserId);

    const pathst = item.type == 'col' ? 'collection' : 'item';
    const name = 'A new Item';

    const isCrossAccountShare = !!(targetUser?.accountId && targetUser.accountId !== ctx.accountId);

    const messageStart = item.type == 'col' ? 'The collection ' : '';
    const actionText = isCrossAccountShare ? 'was shared with you by' : 'was added to your library by';
    const message = `${messageStart}<a href="TS_BASE_PATH#/${pathst}/${item._id}">${name}</a> ${actionText} <a href="TS_BASE_PATH#/user/profile/${currentUser?._id}">${currentUser.username}</a>`;

    const notificationData = {
      title: isCrossAccountShare
        ? `${currentUser.username} shared "${name}" with you.`
        : `${currentUser.username} added "${name}" to your library.`,
      message: message.replace(/TS_BASE_PATH/g, '/kindredapp/'),
      emailMessage: message.replace(/TS_BASE_PATH/g, `${config.serverHostname}/kindredapp/`),
      refInfo: {
        refId: item._id,
        refType: item.type,
      },
    };
    await this.notificationsService.addUserNotification(
      ctx,
      NotificationType.SHARED_ITEM,
      currentUser?._id,
      targetUser?.accountId || ctx.accountId,
      targetUserId,
      notificationData,
    );
  }

  async _deleteCollectionFromAllUserPermissions(collectionId) {
    const permissions = await this._listAllDirectPermissionsForAllUsersPermissionToItem(collectionId);
    for (const p of permissions) {
      await this._removeUserPermission(p.userId, p.itemId);
    }
  }
}

export default PermissionService;
