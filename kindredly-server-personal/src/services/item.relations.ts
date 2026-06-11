import {KEY_DIL} from '@/templates/email.templates';

import {ItemRepo} from '@/db/item.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import PermissionService from './permission.service';
import {RequestContext} from '../base/request_context';
import {PermissionTypeEditableList, PermissionTypeList} from 'tset-sharedlib/shared.types';
import {AuditLogService} from './audit_log.service';

class ItemRelationService {
  private itemRelations = new ItemRelationRepo();
  private items = new ItemRepo();

  private permissionService = new PermissionService();

  public async _getParentRelationsForItem(itemId) {
    return await this.itemRelations.findMany({itemId});
  }

  public async _getItemParentIdsForUser(ctx: RequestContext, targetUserId: string, itemId: string) {
    const colItems = await this._getParentRelationsForItem(itemId);

    let colIds = colItems.map((v) => v.collectionId);
    if (!(await ctx.isAdmin())) {
      const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(targetUserId);
      const uniqueIds = Array.from(new Set(colIds)).filter((v) => typeof v === 'string' && v.length > 0);
      const parentCols = uniqueIds.length > 0 ? await this.items.findWhereIdIn(uniqueIds) : [];
      const colById = Object.fromEntries((parentCols || []).map((c) => [c._id, c]));

      const allowed = new Set<string>();
      for (const pid of uniqueIds) {
        // Direct permission always wins.
        if (pid in permissions && PermissionTypeList.includes(permissions[pid].permission)) {
          allowed.add(pid);
          continue;
        }

        const col = colById[pid] as any;
        if (!col) continue;

        // Visibility-derived access (shared/network) makes the collection discoverable.
        if (col.accountId === ctx.accountId && (col.visibility === 'shared' || col.visibility === 'network')) {
          allowed.add(pid);
          continue;
        }

        if (col.visibility === 'network') {
          const ownerUserId = col.userId;
          if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) {
            allowed.add(pid);
            continue;
          }
        }
      }

      colIds = colIds.filter((pid) => allowed.has(pid));
    }

    return colIds;
  }

  /**
   * Returns full relation objects for an item, filtered by user permission.
   * Used for populating collectionRelations in ItemInfoView responses.
   */
  public async _getItemParentRelationsForUser(ctx: RequestContext, targetUserId: string, itemId: string) {
    const colItems = await this._getParentRelationsForItem(itemId);

    if (await ctx.isAdmin()) {
      return colItems.map((v) => ({
        _id: v._id,
        collectionId: v.collectionId,
        order: v.order,
        createdAt: v.createdAt,
      }));
    }

    const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(targetUserId);

    const uniqueIds = Array.from(new Set(colItems.map((v) => v.collectionId))).filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    const parentCols = uniqueIds.length > 0 ? await this.items.findWhereIdIn(uniqueIds) : [];
    const colById = Object.fromEntries((parentCols || []).map((c) => [c._id, c]));

    const results: Array<{_id: string; collectionId: string; order: any; createdAt: any}> = [];
    for (const v of colItems) {
      const cid = v.collectionId;
      if (!cid) continue;

      if (cid in permissions && PermissionTypeList.includes(permissions[cid].permission)) {
        results.push({_id: v._id, collectionId: cid, order: v.order, createdAt: v.createdAt});
        continue;
      }

      const col = colById[cid] as any;
      if (!col) continue;

      if (col.accountId === ctx.accountId && (col.visibility === 'shared' || col.visibility === 'network')) {
        results.push({_id: v._id, collectionId: cid, order: v.order, createdAt: v.createdAt});
        continue;
      }

      if (col.visibility === 'network') {
        const ownerUserId = col.userId;
        if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) {
          results.push({_id: v._id, collectionId: cid, order: v.order, createdAt: v.createdAt});
          continue;
        }
      }
    }

    return results;
  }

  async getItemRelationInfo(ctx: RequestContext, collectionId, itemId) {
    const hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, collectionId);

    if (!hasPermission) {
      throw new Error("You don't have permission to access this collection");
    }
    return await this._getItemRelationsById(collectionId, itemId);
  }

  //----------------------------------
  //--- Collection/Item Relations ----
  //----------------------------------
  createItemRelationId(collectionId, itemId) {
    return `${collectionId}${KEY_DIL}${itemId}`;
  }

  async getCollectionRelationsById(collectionId) {
    const result = await this.itemRelations.findMany({
      collectionId: collectionId,
    });
    return result;
  }

  async _getMultipleItemRelations(itemIds) {
    const result = await this.itemRelations.findWhereIn('itemId', itemIds);
    return result;
  }

  async _getItemRelationsById(collectionId, itemId) {
    return await this.itemRelations.findById(this.createItemRelationId(collectionId, itemId));
  }

  async _deleteItemRelationById(id) {
    return await this.itemRelations.deleteWithId(id);
  }

  async _removeCollectionItems(ctx: RequestContext, collectionId) {
    //TODO: if item has children, update childrens list of parents
    const result = await this.itemRelations.findMany({
      collectionId: collectionId,
    });
    for (const item of result) {
      await this._deleteItemRelationById(item._id);
    }
    return true;
  }

  async _getCollectionsRelationsForMultiple(collectionIds: string[]) {
    if (!collectionIds || collectionIds.length === 0) return [];
    // Single batched query instead of one per collection (N+1).
    return await this.itemRelations.findWhereIn('collectionId', collectionIds);
  }

  async updateCollectionItemOrder(ctx: RequestContext, collectionId: string, itemRelationIds: string[]) {
    if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, collectionId))) {
      throw new Error("User doesn't have permission to edit collection");
    }
    for (let i = 0; i < itemRelationIds.length; i++) {
      await this.itemRelations.updateWithId(itemRelationIds[i], {order: i});
    }
  }

  async saveCollectionItemDetails(
    ctx: RequestContext,
    collectionId: string,
    itemId: string,
    details: any,
    publishedAvailableAt,

    encInfo: any = null,
  ) {
    if (!(await this.permissionService._hasEditPermissionForCollection(ctx, collectionId))) {
      throw new Error("User doesn't have permission to edit collection");
    }
    let encrypted = false;
    if (encInfo && !encInfo?.decrypt) {
      encrypted = true;
    } else {
      encInfo = null;
    }

    await this.itemRelations.updateWithId(this.createItemRelationId(collectionId, itemId), {
      details,
      publishedAvailableAt,
      encInfo,
      encrypted,
    });
  }

  async _addItemToCollection(
    ctx: RequestContext,
    collectionId: string,
    itemId: string,
    itemType = null as string | null,
    order = null,
    subscriptionUpdate = false,
  ) {
    if (itemId == collectionId) {
      throw Error(`Can't add this item id ${itemId} to collection ${collectionId}`);
    }

    const collection = await ctx.getItemById(collectionId);

    if (!collection) {
      throw new Error(`Couldn't find collection  ${collectionId}`);
    }

    const canEditCollection = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, collectionId);

    if (!canEditCollection) throw new Error("user doesn't have edit permission to this collection: " + collection.name);

    const item = await ctx.getItemById(itemId);

    if (!item) {
      throw new Error(`Couldn't find item ${itemId}`);
    }
    const canEditItem = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, item._id);

    if (!canEditItem) {
      throw new Error("User doesn't have permission to edit this item");
    }

    const relationId = this.createItemRelationId(collectionId, itemId);

    //If exists, don't add again to prevent
    const relation = await this.itemRelations.findById(relationId);
    if (relation) {
      return collectionId;
    }

    if (!itemType) {
      itemType = item.type;
    }

    if (order == null) order = collection.itemCount;

    const now = new Date();
    const info = {
      _id: relationId,
      itemId: itemId,
      userId: ctx.currentUserId,
      itemType: itemType,
      collectionId: collectionId,
      accountId: ctx.accountId,
      createdAt: now,
      order: order,
    };

    await this.itemRelations.create(info);
    await this.items.updateWithId(collectionId, {itemCount: order + 1});

    try {
      await AuditLogService.instance.log(ctx, {
        action: 'collection_item.add',
        entityType: 'collection',
        entityId: collectionId,
        relatedIds: {itemId},
      });
    } catch (e) {
      console.error('audit_log: failed to log collection_item.add', e);
    }

    return collectionId;
  }

  // ROUTE-METHOD
  // Re-parenting requires edit access to the item itself; edit access to the
  // destination collection alone is not sufficient.
  async updateItemToCollectionMembership(
    ctx: RequestContext,
    itemId: string,
    collectionIds: string[],
    removeCollectionIds: string[] = [],
  ) {
    const item = await ctx.getItemById(itemId);

    const canEditItem = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);
    if (!canEditItem) {
      throw new Error("You don't have permission to edit this item");
    }

    const results = [];
    for (const colId of collectionIds) {
      results.push(await this._addItemToCollection(ctx, colId, itemId, item.type));
    }

    if (!!removeCollectionIds) {
      for (const colId of removeCollectionIds) {
        await this.removeItemFromCollection(ctx, colId, itemId);
      }
    }

    return results;
  }

  // ROUTE-METHOD
  async removeItemFromCollection(
    ctx: RequestContext,
    collectionId: string,
    itemId: string,
    subscriptionUpdate = false,
    skipPermissionUpdate = false,
  ) {
    if (!skipPermissionUpdate) {
      let hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, collectionId);

      if (!hasEditPermission) {
        let hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, itemId);

        if (!hasEditPermission) {
          throw new Error("User doesn't have permission to edit collection");
        }
      }
    }

    const id = this.createItemRelationId(collectionId, itemId);
    const collection = await this.items.findById(collectionId);

    await this._deleteItemRelationById(id);

    await this.items.updateWithId(collectionId, {
      itemCount: collection.itemCount - 1,
    });

    try {
      await AuditLogService.instance.log(ctx, {
        action: 'collection_item.remove',
        entityType: 'collection',
        entityId: collectionId,
        relatedIds: {itemId},
      });
    } catch (e) {
      console.error('audit_log: failed to log collection_item.remove', e);
    }

    return true;
  }

  // ROUTE-METHOD
  async removeItemFromCollectionWithRelationId(ctx: RequestContext, collectionId: string, relationId: string) {
    // check if has edit perm to collection or item
    if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, collectionId))) {
      const relation = await this.itemRelations.findById(relationId);
      if (!relation) {
        throw new Error('Relation not found');
      }
      if (!(await this.permissionService._hasEditPermissionDirectOrAsAdmin(ctx, relation.itemId))) {
        throw new Error("User doesn't have permission to edit collection");
      }
    }

    const collection = await this.items.findById(collectionId);

    await this._deleteItemRelationById(relationId);

    // TODO: Deprecate itemCount?
    await this.items.updateWithId(collectionId, {
      itemCount: collection.itemCount - 1,
    });

    return true;
  }
}

export default ItemRelationService;
