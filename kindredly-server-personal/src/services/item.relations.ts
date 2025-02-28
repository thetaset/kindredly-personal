import { KEY_DIL } from '@/templates/email.templates';

import { ItemRepo } from "@/db/item.repo";
import { ItemRelationRepo } from "@/db/item_relation.repo";
import PermissionService from "./permission.service";
import { RequestContext } from "../base/request_context";
import { PermissionTypeEditableList, PermissionTypeList } from 'tset-sharedlib/shared.types';

class ItemRelationService {
  private itemRelations = new ItemRelationRepo();
  private items = new ItemRepo();

  private permissionService = new PermissionService();

  public async _getParentRelationsForItem(itemId) {
    return await this.itemRelations.findMany({ itemId });
  }

  public async _getItemParentIdsForUser(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string
  ) {
    const colItems = await this._getParentRelationsForItem(itemId);

    let colIds = colItems.map((v) => v.collectionId);
    if (!(await ctx.isAdmin())) {
      const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(
        targetUserId
      );
      colIds = colIds.filter(
        (pid) =>
          pid in permissions &&
          PermissionTypeList.includes(permissions[pid].permission)
      );
    }

    return colIds;
  }

  async getItemRelationInfo(ctx: RequestContext, collectionId, itemId) {
    const hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(
      ctx,
      collectionId,
    );

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
    const result = await this.itemRelations.findWhereIn("itemId", itemIds);
    return result;
  }

  async _getItemRelationsById(collectionId, itemId) {
    return await this.itemRelations.findById(
      this.createItemRelationId(collectionId, itemId)
    );
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
    const allRelations = [];
    for (const colid of collectionIds) {
      const relations = await this.getCollectionRelationsById(colid);
      allRelations.push(...relations);
    }
    return allRelations;
  }

  async updateCollectionItemOrder(
    ctx: RequestContext,
    collectionId: string,
    itemRelationIds: string[]
  ) {
    if (
      !(await this.permissionService._hasEditPermissionDirectOrAsAdmin(
        ctx,
        collectionId
      ))
    ) {
      throw new Error("User doesn't have permission to edit collection");
    }
    for (let i = 0; i < itemRelationIds.length; i++) {
      await this.itemRelations.updateWithId(itemRelationIds[i], { order: i });
    }
  }

  async saveCollectionItemDetails(
    ctx: RequestContext,
    collectionId: string,
    itemId: string,
    details: any,
    publishedAvailableAt,

    encInfo: any = null
  ) {
    if (
      !(await this.permissionService._hasEditPermissionForCollection(
        ctx.currentUserId,
        collectionId
      ))
    ) {
      throw new Error("User doesn't have permission to edit collection");
    }
    let encrypted = false;
    if (encInfo && !encInfo?.decrypt) {
      encrypted = true;
    } else {
      encInfo = null;
    }

    await this.itemRelations.updateWithId(
      this.createItemRelationId(collectionId, itemId),
      {
        details,
        publishedAvailableAt,
        encInfo,
        encrypted,
      }
    );
  }

  async _addItemToCollection(
    ctx: RequestContext,
    collectionId: string,
    itemId: string,
    itemType = null as string | null,
    order = null,
    subscriptionUpdate = false
  ) {
    if (itemId == collectionId) {
      throw Error(
        `Can't add this item id ${itemId} to collection ${collectionId}`
      );
    }

    const collection = await ctx.getItemById(collectionId);

    if (!collection) {
      throw new Error(`Couldn't find collection  ${collectionId}`);
    }

    const canEditCollection = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      collectionId
    );

    if (!canEditCollection)
      throw new Error(
        "user doesn't have edit permission to this collection: " +
        collection.name
      );

    const item = await ctx.getItemById(itemId);

    if (!item) {
      throw new Error(`Couldn't find item ${itemId}`);
    }
    const canEditItem = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      item._id
    );

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
    await this.items.updateWithId(collectionId, { itemCount: order + 1 });

    return collectionId;
  }


  // ROUTE-METHOD
  // TODO: user should be able to add item to collection if they have edit permission to the collection
  async updateItemToCollectionMembership(
    ctx: RequestContext,
    itemId: string,
    collectionIds: string[],
    removeCollectionIds: string[] = []
  ) {
    const item = await ctx.getItemById(itemId);

    const hasAnyPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );
    if (!hasAnyPermission) {
      throw new Error("You don't have permission to modify this item");
    }

    const results = [];
    for (const colId of collectionIds) {
      results.push(
        await this._addItemToCollection(ctx, colId, itemId, item.type)
      );
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
    skipPermissionUpdate = false
  ) {

    if (!skipPermissionUpdate) {
      let hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
        ctx,
        collectionId
      );

      if (!hasEditPermission) {

        let hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
          ctx,
          itemId
        );

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

    return true;
  }



  // ROUTE-METHOD
  async removeItemFromCollectionWithRelationId(
    ctx: RequestContext,
    collectionId: string,
    relationId: string
  ) {


    // check if has edit perm to collection or item
    if (
      !(await this.permissionService._hasEditPermissionDirectOrAsAdmin(
        ctx,
        collectionId
      ))
    ) {
      const relation = await this.itemRelations.findById(relationId);
      if (!relation) {
        throw new Error("Relation not found");
      }
      if (!await this.permissionService._hasEditPermissionDirectOrAsAdmin(
        ctx,
        relation.itemId
      )) {
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
