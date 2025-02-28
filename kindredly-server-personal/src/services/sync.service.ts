import { UserChangeLogRepo } from "@/db/user_changelog.repo";
import { RequestContext } from "@/base/request_context";
import { DynamicObject } from "@/utils/crypto_util";

import { ItemChangeLogUpdate, ItemType } from "tset-sharedlib/shared.types";
import ItemListService from "./item.list.service";
import ItemRelationService from "./item.relations";
import ItemService from "./item.service";
import UserService from "./user.service";
import { config } from "@/config";

enum SyncType {
  itemUpdate = "itemUpdate",
  fullReset = "fullReset",
}

class SyncService {
  private changeLog = new UserChangeLogRepo();
  private itemService = new ItemService();
  private itemlistService = new ItemListService();
  private itemRelationService = new ItemRelationService();
  private userService = new UserService();


  // ROUTE-METHOD
  async runSync(
    ctx: RequestContext,
    targetUserId: string,
    time: any
  ): Promise<ItemChangeLogUpdate> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    this.userService.updateLastActiveAt(ctx);


    let fullResetRequest = false;
    const updatedItemIdsSet = new Set<string>();
    if (!time) {
      fullResetRequest = true;
    } else {
      const lst = await this.changeLog.changeLogSince(targetUserId, time);

      for (const v of lst) {
        const data = v.data as DynamicObject;
        if (data.type == SyncType.itemUpdate && Array.isArray(data.items)) {
          for (const itemId of data.items) updatedItemIdsSet.add(itemId);
        } else if (data?.type == SyncType.fullReset) {
          fullResetRequest = true;
          break;
        } else {
          console.log("Something wrong, full reset instead", v);
          fullResetRequest = true;
          break;
        }
      }
    }

    // ************************FULL RESET***********************
    // If full reset requested, return full reset
    if (fullResetRequest) {

      const syncData = await this._syncAll(ctx, targetUserId);
      if (config.devMode) {
        console.log("Synced items (full reset)", syncData.totalUpdates);
      }
      return syncData;
    }

    // Otherwise, get changed items only

    return await this._syncPartial(ctx, targetUserId, updatedItemIdsSet,);
  }


  async _syncAll(
    ctx: RequestContext,
    targetUserId: string
  ): Promise<ItemChangeLogUpdate> {
    if (!targetUserId) {
      throw "Error ";
    }

    const items = await this.itemlistService.listAllItemsWithInfoByUser(
      ctx,
      targetUserId
    );

    const removedItemIds = [];

    return {
      fullReset: true,
      totalUpdates: items.length,
      updatedItems: items,
      removedItemIds,
    };
  }
  private async _syncPartial(ctx: RequestContext, targetUserId: string, updatedItemIdsSet: Set<string>,) {

    // ************************ADDED ITEMS***********************
    // Cases:
    // 1 - items in change log
    // 2 - items in collections that were added

    const updatedItemsInLibrary = updatedItemIdsSet.size > 0
      ? await this.itemlistService.listItemsWithInfoByUserForItemIds(
        ctx,
        targetUserId,
        updatedItemIdsSet
      )
      : [];

    const updatedItemIdsInLibrarySet = new Set(
      updatedItemsInLibrary.map((v: any) => v.details._id)
    );

    const updatedCollectionsInLibrary = updatedItemsInLibrary
      .filter((v) => v.details.type == ItemType.collection)
      .map((v) => v.details);

    const updatedCollectionIds = updatedCollectionsInLibrary.map((v) => v._id);

    // get items added because collection was added
    const additionalAddedItemIdsSet = new Set(
      (
        await this.itemRelationService._getCollectionsRelationsForMultiple(
          updatedCollectionIds
        )
      ).map((v) => v.itemId)
    );

    const additionalAddedItems = additionalAddedItemIdsSet.size > 0
      ? await this.itemlistService.listItemsWithInfoByUserForItemIds(
        ctx,
        targetUserId,
        additionalAddedItemIdsSet
      )
      : [];

    const updatedItems = [...updatedItemsInLibrary, ...additionalAddedItems];
    let removedItemIds = [];

    // ************************REMOVED ITEMS************************
    // Removed items are items in request list but not in library now
    // Cases:
    // 1 - items in update change log but not in those requested from library
    // 2 - items that are in a collection that was removed, but not in collection that user still has access to
    // -
    const removedIds = Array.from(updatedItemIdsSet).filter(
      (v) => !updatedItemIdsInLibrarySet.has(v)
    );

    if (removedIds.length > 0) {
      const currentCollectionIdSet = new Set(
        await this.itemService._listUserCollectionIdsWithPermissionType(targetUserId)
      );
      const removedItems = await this.itemlistService.getItemsByIds(
        ctx.accountId,
        removedIds
      );
      const removedColIds = removedItems
        .filter((v) => v.type == ItemType.collection && !currentCollectionIdSet.has(v._id))
        .map((v) => v._id);

      const itemIdsFromRemovedCollections = (
        await this.itemRelationService._getCollectionsRelationsForMultiple(
          removedColIds
        )
      ).map((v) => v.itemId);
      const relationsForItemIdsFromRemovedCollections = await this.itemRelationService._getMultipleItemRelations(
        itemIdsFromRemovedCollections
      );

      // check if user still has access to item via other collection, if yes, use to filter out from removed
      const remainingIdsSet = new Set(
        relationsForItemIdsFromRemovedCollections
          .filter((v) => currentCollectionIdSet.has(v.collectionId))
          .map((v) => v.itemId)
      );
      const additionalRemovedItemIds = itemIdsFromRemovedCollections.filter(
        (v) => !remainingIdsSet.has(v)
      );
      removedItemIds = [...removedIds, ...additionalRemovedItemIds];
    }

    const totalUpdates = updatedItems.length + removedItemIds.length;

    if (config.devMode) {
      console.log("Synced items (partial update)", updatedItems.length, removedItemIds.length);

      //TODO: bug should not be removed
      console.log("  --- Synced items items", { updatedItemIds: updatedItems.map(v => v.itemId), removedItemIds });
    }

    return {
      fullReset: false,
      totalUpdates,
      updatedItems,
      removedItemIds,
    };
  }
}

export default SyncService;
