import { v4 as uuidv4 } from "uuid";
import EventAuditService from "./record_event.service";

import { AccountRepo } from "@/db/account.repo";
import { ItemRepo } from "@/db/item.repo";
import { UserRepo } from "@/db/user.repo";
import { UserChangeLogRepo } from "@/db/user_changelog.repo";
import Item from "@/schemas/public/Item";
import AccessRequestService from "./access_request.service";
import FeedbackService from "./feedback.service";
import ItemRelationService from "./item.relations";
import NotificationService from "./notification.service";
import PermissionService from "./permission.service";
import { RequestContext } from "../base/request_context";
import { UserPermRepo } from "@/db/user_perm.repo";
import { ItemRelationRepo } from "@/db/item_relation.repo";
import ChangeLogService from "./change_log.service";
import UserFileService from "./user_file.service";
import {
  EventRecordName,
  EventRecordType,
  NotificationType,
} from "@/typing/enum_strings";
import {
  ItemAttachment,
  ItemInfoViewWithDateObjs,
  ItemType,
  PermissionType,
  PermissionTypeList,
  PermissionTypeEditableList,
  UserType,
} from "tset-sharedlib/shared.types";
import ItemFeedback from "@/schemas/public/ItemFeedback";
import { logger } from "@/utils/logger";
import { DynamicObject } from "@/utils/crypto_util";
import { SysInfoRepo } from "@/db/sysinfo.repo";
import {container} from "@/inversify.config";

const allowedAttributes = [
  "isRead",
  "isReadLater",
  "reaction",
  "isArchived",
  "isStarred",
  "starredDate",
  "snoozeUntilDate",
  "neverRemindDate",
  "archivedDate",
  "isHidden",
];

const validAttributes = new Set([
  "name",
  "description",
  "comment",
  "type",
  "subType",
  "permanent",
  "visibility",
  "categories",
  "tags",
  "useCriteria",
  "url",
  "patterns",
  "imageFilename",
  "info",
  "meta",
  "metaUpdatedAt",
  "published",
  "publishId",
  "publishName",
  "publishDescription",
  "publishVisibilityCode",
  "publishUpdateType",
  "publishType",
  "publishConfig",
  "deleted",
  "sourceInfo",
  "archived",
  "encInfo",
  "encrypted",
]);

function getSanitizedItemForSaving(data: Item): Item {

  let newData: Item = {};
  for (const [key, value] of Object.entries(data)) {
    if (validAttributes.has(key)) {
      newData[key] = value;
    }
  }

  return newData;
}

function checkIfItemIsEncrypted(data: Item) {
  let encrypted = false;
  if (data?.encInfo?.decrypt == true) {
    data.encInfo = null;
  }
  if (data?.encInfo != null) {
    encrypted = true;
  }
  return encrypted;
}

interface CreateCollectionOptions {
  collectionIds?: string[];
  permList?: any[];
  customPermissions?: boolean;
  skipNotifications?: boolean;
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

  //--------------------
  //-------Common ---------
  //--------------------

  // TODO: move this category stuff to a separate service
  async _getAllCategories() {
    //sub categories later
    const categories = {
      Art: {},
      "DIY and Home Improvement": {},
      Entertainment: {},
      Education: {},
      Exercise: {},
      Finance: {},
      "Food and Diet": {},
      "Language and Literature": {},
      Health: {},
      "History and Culture": {},
      "Kids and Family": {},
      Math: {},
      Music: {},
      Miscellaneous: {},
      News: {},
      Politics: {},
      Productivity: {},
      "Reference, Data, and Statistics": {},
      "Science and Nature": {},
      "Shopping and Products": {},
      Sports: {},
      Technology: {},
    };
    return Object.keys(categories);
  }

  async getCategories(availOnly = false) {
    if (availOnly) {
      return await this._getAvailCategories();
    } else return await this._getAllCategories();
  }

  async _getItemsByQuery(query) {
    return await this.itemRepo.findMany(query);
  }

  async _getCollectionCount(accountId: string) {
    return await this.itemRepo.countRows({ accountId, type: ItemType.collection });
  }

  async _getAvailCategories() {
    const cats = (await this.sysInfo.findById("cats")) as DynamicObject;
    if (!cats) return [];
    else {
      logger.log("cats", cats);
      return cats?.data?.items;
    }
  }
  

  async updateAvailCategories(categories: string[], replace = false) {
    if (!categories || !Array.isArray(categories)) {
      console.error("Failed to update categories, with ", categories);
      return;
    }
    logger.log("Updating available categories in database", categories);
    const currentCats = replace ? [] : (await this._getAvailCategories()) || [];

    const cats = new Set([...currentCats, ...categories]);

    //TODO: silly to sort here
    const catsList = Array.from(cats).filter((v) => !!v);
    logger.log("catsList", catsList);
    await this.sysInfo.create({ _id: "cats", data: { items: catsList } });
  }

  // ROUTE-METHOD
  async getPathTree(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string,
    selectedParentId = null
  ) {
    await ctx.verifyInAccount(targetUserId);
    return await this._getPathTree(ctx, targetUserId, itemId, selectedParentId);
  }

  async _getPathTree(
    ctx: RequestContext,
    targetUserId: string,
    itemId: string,
    selectedParentId = null,
    depth = 0,
    results = [],
    maxDepth = 6
  ) {
    let parents = await this._getParentItemsForUser(ctx, targetUserId, itemId);

    // const permissions = (await ctx.getTargetUser())
    const permissions = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(
      targetUserId
    );
    parents = parents.filter((p) => p._id in permissions);

    if (!parents || parents.length == 0) {
      return results;
    } else {
      let selectedParentIdx = 0;
      //sort parents by name
      if (selectedParentId) {
        selectedParentIdx = parents.findIndex((v) => v._id == selectedParentId);
      }
      const item = parents[selectedParentIdx];
      selectedParentId = item._id;

      parents.splice(selectedParentIdx, 1);

      const earlyEnd = depth >= maxDepth;

      results.push({ item: item, others: parents, earlyEnd: earlyEnd });
      if (earlyEnd) {
        return results;
      } else {
        return await this._getPathTree(
          ctx,
          targetUserId,
          selectedParentId,
          null,
          depth + 1,
          results
        );
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
    }
  ): Promise<string> {
    //TODO: convert to limited to avoid admins adding collections for other admin users
    await ctx.verifySelfOrAdmin(targetUserId);

    const account = await this.accounts.findById(ctx.accountId);
    const colCount = await this._getCollectionCount(ctx.accountId);
    if (colCount >= account.maxCollections)
      throw Error(
        `You already have the maximum number (${account.maxCollections}) of collections in your account.`
      );

    const now = new Date();

    const itemId = "col_" + uuidv4();

    const itemToSave = getSanitizedItemForSaving(itemDetails);

    let encrypted = checkIfItemIsEncrypted(itemToSave);

    const item: Item = {
      ...itemToSave,
      _id: itemId,
      userId: targetUserId,
      accountId: ctx.accountId,
      createdAt: now,
      updatedAt: now,
      type: ItemType.collection,
      encrypted: encrypted,
    };

    let {
      collectionIds = [],
      permList = [],
      customPermissions = false,
      skipNotifications = false,
    } = options;

    await this.itemRepo.create(item);

    // add item to parents
    if (collectionIds) {
      for (const colId of collectionIds) {
        await this.itemRelationService._addItemToCollection(
          ctx,
          colId,
          itemId,
          ItemType.collection
        );
      }
    }

    if (ctx.currentUserId != targetUserId && !skipNotifications) {
      this.permissionService
        ._sendShareNotification(ctx, targetUserId, item)
        .catch((e) => {
          console.error("Error sending share notification", e);
        });
    }

    const user = await this.users.findById(targetUserId);
    const userData = (user.userData || {}) as UserData;
    let collectionIdHistory = userData["collectionIdHistory"] || [];
    collectionIdHistory = [itemId, ...collectionIdHistory].slice(0, 5);
    userData.collectionIdHistory = collectionIdHistory;
    await this.users.updateWithId(targetUserId, { userData });

    if (
      (!permList || permList.length == 0) &&
      collectionIds
    ) {
      const permMap = {};
      for (const pcolId of collectionIds) {
        const parentPerms = await this.permissionService._listAllDirectPermissionsForAllUsersPermissionToItem(
          pcolId
        );
        for (const parentPerm of parentPerms) {
          permMap[parentPerm.userId] = parentPerm;
        }
      }
      permList.push(...Object.values(permMap));
    }

    if (permList && permList.length > 0) {
      for (const perm of permList) {
        if (
          perm.userId != targetUserId &&
          PermissionTypeList.includes(perm.permission)
        ) {
          let addedPermission = perm.permission;


          //We can only have one owner, the user adding the collection
          if (addedPermission == PermissionType.owner) addedPermission = PermissionType.editor;
          await this.permissionService._setUserPermission(
            ctx,
            perm.userId,
            itemId,
            addedPermission
          );

          if (
            ctx.currentUserId != perm.userId &&
            perm.permission != PermissionType.owner &&
            !skipNotifications
          ) {
            this.permissionService
              ._sendShareNotification(ctx, perm.userId, item)
              .catch((e) => {
                console.error("Error sending share notification", e);
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

    this.changeLoggerService
      .logItemChangeForUserIds(Array.from(usersToUpdate), [itemId])
      .catch((e) => { });

    this.evenLogService
      .recordEvent({
        eventName: EventRecordName.CREATE_ACCOUNT,
        eventType: EventRecordType.EXPLICIT,
        accountId: ctx.accountId,
        userId: targetUserId,
      })
      .catch((e) => { });

    return itemId;
  }

  // ROUTE-METHOD
  async removeUserCollections(
    ctx: RequestContext,
    targetUserId: string,
    collectionIds = [],
    fullRemove = true
  ) {

    await ctx.verifySelfOrAdmin(targetUserId);

    for (const cid of collectionIds) {
      if (fullRemove) {
        await this.permissionService._removeUserPermission(targetUserId, cid);
      } else {
        throw Error("Disable/non full removal not implemented");
      }
    }
    return {};
  }

  async _createDefaultQuickBarCollection(ctx: RequestContext, targetUserId: string) {
    const user = await ctx.getUserById(targetUserId);
    if (user.quickBarCollectionId) {
      const col = await this.itemRepo.findById(user.quickBarCollectionId);
      if (col.subType == "defaultQuickbar") {
        console.log("Quickbar exists");
        return false;
      }
    }

    const newCollectionId = await this.createCollection(
      ctx,
      targetUserId,
      {
        name: "Quickbar",
        subType: "defaultQuickbar",
        permanent: true,
      },
      { skipNotifications: true }
    );

    await this.users.updateWithId(user._id, {
      quickBarCollectionId: newCollectionId,
    });
    return true;
  }

  async _createDefaultSharedCollection(
    ctx: RequestContext,
    targetUserId: string
  ) {
    const users = await this.users.listByAccountId(ctx.accountId);

    if (users.length == 1) {
      return;
    }

    const targetUser = await ctx.getUserById(targetUserId);

    const permissionSt = targetUser.type == UserType.admin ? PermissionType.editor : PermissionType.viewer;

    const defaultSharedCollection = await this.itemRepo.findWhere({
      accountId: ctx.accountId,
      subType: "defaultSharedCollection",
    });

    if (defaultSharedCollection != null) {
      console.log("Default shared collection exists, giving permission");
      await this.permissionService._setUserPermission(
        ctx,
        targetUserId,
        defaultSharedCollection._id,
        permissionSt
      );
      return;
    }

    const newCollectionId = await this.createCollection(
      ctx,
      ctx.currentUserId,
      {
        name: "Shared Collection",
        description: "Default shared collection for all users in the account.",
        subType: "defaultSharedCollection",
        permanent: true,
      },
      { skipNotifications: false }
    );

    await this.permissionService.setUserPermission(
      ctx,
      targetUserId,
      newCollectionId,
      permissionSt
    );

    return true;
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
      type: ItemType.collection,
    });
    return collections;
  }

  async _getCollectionsWithName(accountId, name) {
    const cols = await this._getItemsByQuery({
      accountId,
      name,
      type: ItemType.collection,
    });
    return cols;
  }

  async _getCollectionsWithpublishId(accountId, publishId) {
    const cols = await this._getItemsByQuery({ accountId, publishId });
    return cols;
  }

  async listChildItemIdsForCollectionWithId(collectionId: string) {
    const items = await this.itemRelations.findMany({ collectionId });

    return items
      .filter((v) => v.itemType != ItemType.collection)
      .map((v) => v.itemId);
  }


  // ROUTE-METHOD
  // TODO: incomplete
  async removeCollectionById(
    ctx: RequestContext,
    collectionId: string,
    deleteItems: boolean = false
  ) {

    // check permissions
    const collection = await this.itemRepo.findById(collectionId);
    if (!collection) {
      return true;
    }

    if (
      !(await this.permissionService._hasPermissionDirectlyOrAsAdmin(
        ctx,
        collectionId,
        [PermissionType.owner, PermissionType.editor]
      ))
    ) {
      throw new Error("no permissions");
    }

    if (deleteItems) {
      let itemIds = await this.listChildItemIdsForCollectionWithId(
        collectionId
      );

      // get items with only one parent
      let relations = await this.itemRelations.findWhereIn("itemId", itemIds);
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
      await this.permissionsRepo.deleteWhereIn("itemId", deleteItems);

      await this.feedbackService.itemFeedbackRepo.deleteWhereIn(
        "itemId",
        deleteItems
      );

      // TODO: delete comments?

      await this.itemRepo.deleteWhereIn("_id", deleteItems);
    }

    await this.itemRelations.deleteWhere({ collectionId: collectionId });

    await this.itemRelationService._removeCollectionItems(ctx, collectionId);
    await this.permissionService._deleteCollectionFromAllUserPermissions(
      collectionId
    );
    await this.itemRepo.deleteWithId(collectionId);

    return true;
  }



  // ROUTE-METHOD
  async deleteItem(ctx: RequestContext, itemId:string) {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      return true;
    }

    let hasPerm = await this.permissionService._hasPermissionDirectlyOrAsAdmin(ctx, itemId, PermissionTypeEditableList);
    if (!hasPerm) {
      throw new Error("No permission to delete item");
    }

    await this.permissionsRepo.deleteWhere({ itemId: itemId });
    await this.itemRelations.deleteWhere({ itemId: itemId });
    await this.itemRelations.deleteWhere({ collectionId: itemId });

    let attachments = item.attachments?.entries || ([] as ItemAttachment[]);
    try {
      for (const att of attachments) {
        if (att.fileId) {
          await this.userFileService._removeUserFileById(ctx, att.fileId);
        }
      }
    } catch (e) {
      console.error("Error removing attachments", e);
    }

    await this.itemRepo.deleteWithId(itemId);
    return true;
  }

  async _listUserCollectionIdsWithPermissionType(userId: string, permissionFilterList = null) {
    const permissions = await this.permissionService._listDirectPermissionsForUserWithType(
      userId, ItemType.collection
    );
    if (!permissionFilterList || permissionFilterList.length == 0)
      return permissions.map((v) => v.itemId);
    else {
      permissionFilterList = permissionFilterList.filter((v) => v != "");
      return permissions
        .filter((v) => permissionFilterList.includes(v.permission))
        .map((v) => v.itemId);
    }
  }
  
  
  // ROUTE-METHOD
  // TODO: Clean up needed.
  // Doesn't get permissions correctly - missing owners
  // DON"T need this except for path?? - see listLibraryCollections
  // Note, targetUserId is only used for appending the parent PATH
  async listCollectionsByAccount(
    ctx: RequestContext,
    targetUserId: string,
    ids = null,
    includePath = null,
    includeUserPermissions = null
  ): Promise<Array<Item>> {
    await ctx.verifyInAccount(targetUserId);

    let collections: Array<Item> = [];
    if (!ids) {
      collections = await this._getCollectionsForAccount(ctx.accountId);
      ids = collections.map((v) => v._id);
    } else {
      collections = await this.itemRepo.getItemsByIds(ctx.accountId, ids);

      //reorder
      const lookup = Object.fromEntries(collections.map((v) => [v._id, v]));
      collections = ids
        .map((id) => lookup[id])
        .filter((v) => v?.type == ItemType.collection);
    }

    if (includeUserPermissions) {
      const permLookup = await this.permissionService._getPermissionLookupForAccountUsers(
        ctx.accountId,
        ids
      );

      for (const collection of collections) {
        collection["users"] = permLookup[collection._id];
      }
    }

    collections = collections.filter((v) => v != null);
    if (includePath) {
      for (const collection of collections) {
        const pathTree = await this._getPathTree(
          ctx,
          targetUserId,
          collection._id
        );
        collection["pathItems"] = pathTree.map((v) => {
          return {
            _id: v.item._id,
            name: v.item.name,
            encInfo: v.item.encInfo,
            encrypted: v.item.encrypted,
          };
        });
      }
    }
    return collections;
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
    includeParents = false
  ) {
    await ctx.verifyInAccount(targetUserId);

    //TODO: So inefficient
    //TODO: check current user permissions
    const targetUser = await ctx.getUserById(targetUserId);

    let isSelfOrUserAdmin = await ctx.isSelfOrAdminOfUser(targetUserId);

    if (!isSelfOrUserAdmin) {
      sharedOnly = true;
    }

    const userCollectionIds = await this._listUserCollectionIdsWithPermissionType(
      targetUserId,
      permissionFilterList
    );

    const colIdSet = new Set(userCollectionIds);
    const targetUserPermissionLookup = await this.permissionService._getUserDirectPermissionLookupExcludingOwner(
      targetUserId
    );

    // TODO: Use join query with permissions
    let collections = await this._getCollectionsForAccount(
      targetUser.accountId
    );

    //TODO Should work as long as not too many collections in account. Could also use getByIds
    collections = collections.filter((c) => colIdSet.has(c._id));
    if (sharedOnly) {
      collections = collections.filter((c) => c.visibility == "shared");
    }

    if (includeUserPermissions) {
      const allPermissionLookup = await this.permissionService._getPermissionLookupForAccountUsers(
        ctx.accountId,
        userCollectionIds
      );
      for (const col of collections) {
        col["allPerms"] = allPermissionLookup[col._id];
      }
    }
    if (includeParents) {
      let parentList = await this.itemRepo
        .query()
        .from("item_relation")
        .whereIn("item_relation.itemId", userCollectionIds)
        .leftJoin("item", "item_relation.collectionId", "=", "item._id")
        .select("item.*", "item_relation.itemId as childId");

      const parentMap = {};
      for (const parent of parentList) {
        if (!parentMap[parent.childId]) {
          parentMap[parent.childId] = [];
        }
        parentMap[parent.childId].push(parent);
      }
      for (const col of collections) {
        col["parents"] = parentMap[col._id] || [];
      }
    }
    //add user permission info to each collection
    console.log("targetUserPermissionLookup", targetUserPermissionLookup);
    for (const col of collections) {
      const permEntry = targetUserPermissionLookup[col._id];
      col["permission"] = permEntry?.permission;
      col["permissionUserId"] = permEntry?.userId;

    }
    if (includePath) {
      for (const collection of collections) {
        const pathTree = await this._getPathTree(
          ctx,
          targetUserId,
          collection._id
        );
        collection["pathItems"] = pathTree.map((v) => {
          return {
            _id: v.item._id,
            name: v.item.name,
            encInfo: v.item.encInfo,
            encrypted: v.item.encrypted,
          };
        });
      }
    }
    return collections
      .filter((v) => v._id != null)
      .filter((v) => !v.archived)
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
        };
      });
  }


  //------------------------
  //------- Item -----------
  //------------------------

  // ROUTE-METHOD
  public async getParentItemsForUser(
    ctx: RequestContext,
    targetUserId: string,
    itemId:string,
    includePath = null
  ) {
    await ctx.verifyInAccount(targetUserId);

   return await this._getParentItemsForUser(ctx, targetUserId, itemId, includePath);
  }

  public async _getParentItemsForUser(
    ctx: RequestContext,
    targetUserId: string,
    itemId:string,
    includePath = null
  ) {

    const colIds = await this.itemRelationService._getItemParentIdsForUser(
      ctx,
      targetUserId,
      itemId
    );
    if (!colIds) return null;

    const items = await this.listCollectionsByAccount(
      ctx,
      targetUserId,
      colIds,
      includePath
    );

    return items;
  }

  // ROUTE-METHOD
  //TODO: can just use get item info
  public async getCollectionById(
    ctx: RequestContext,
    itemId: string,
    includeUserPermissions = null,
    includeFeedback = false
  ) {
    if (!itemId) return null;

    const collection = await ctx.getItemById(itemId);

    if (!collection) return null;

    let hasPermission =
      collection.accountId == ctx.accountId &&
      (collection.visibility == "shared" || (await ctx.isAdmin()));

    if (!hasPermission) {
      hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(
        ctx,
        collection._id,
      );

      if (!hasPermission) {
        throw new Error("No permission to view collection");
      }
    }

    if (includeUserPermissions) {
      const permLookup = await this.permissionService._getPermissionLookupForAccountUsers(
        ctx.accountId,
        [itemId]
      );

      collection["users"] = permLookup[itemId] || [];
    }

    if (includeFeedback) {
      const feedback = await this.feedbackService._getItemFeedbackForUser(
        ctx,
        itemId
      );
      collection["feedback"] = feedback;
    }

    return collection;
  }

  // 
  async __debugItem(itemId){
    let item = await this.itemRepo.findById(itemId);

    let permissionsToItem = await this.permissionsRepo.findMany({itemId
    });
    let permissions = permissionsToItem.map((v) => {
      return {
        userId: v.userId,
        permission: v.permission,
      }
    }
    );

    console.log("Item Permissions",{permissionsToItem, permissions});


  }

  // ROUTE-METHOD
  async getItemInfoById(
    ctx: RequestContext,
    itemId: string,
    detailsOnly = false
  ): Promise<ItemInfoViewWithDateObjs> {

    if (!itemId) return null;

    // await this.__debugItem(itemId);

    const hasPerm = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );

    if (!hasPerm) {
      throw new Error("No permission to view item");
    }

    const itemDetails = await ctx.getItemById(itemId);
    if (!itemDetails) {
      throw new Error("Item not found");
    }

    //optimization
    if (detailsOnly) {
      return {
        itemId: itemDetails._id,
        details: itemDetails,
      };
    }

    const collectionIds = await this.itemRelationService._getItemParentIdsForUser(
      ctx,
      ctx.currentUserId,
      itemId
    );

    const data: ItemInfoViewWithDateObjs = {
      itemId,
      collectionIds,
      details: itemDetails,
      feedback: (await this.feedbackService._getItemFeedback(
        ctx.currentUserId,
        itemId
      )) as any,
    };

    return data;
  }


  async _createItem(
    ctx: RequestContext,
    itemDetails: Item,
    assignDirectOwnerPermission: boolean = false
  ) {

    const now = new Date();

    if (!itemDetails.type) {
      throw new Error("Must provide type if creating new item");
    }
    const itemId =
      itemDetails.type == ItemType.collection
        ? `col_${uuidv4()}`
        : `item_${uuidv4()}`;

    let encrypted = checkIfItemIsEncrypted(itemDetails);

    const itemUpdates = getSanitizedItemForSaving(itemDetails);

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
      type: "itemUpdate",
      items: [itemId],
    });
    return itemId;
  }


  // ROUTE-METHOD
  async saveItem(
    ctx: RequestContext,
    itemId: string | null,
    details: Record<string, any>,
    collectionIds: Array<string> = [],
    removeMissingCollections = false,
    quickShareUserIds: Array<string> = [],
    accessRequestId?: string,
    feedbackUpdate?: { attr: string; value: any }
  ) {
    if (!details) {
      throw "Failed to save item.";
    }

    const noCollections =
      collectionIds == undefined || collectionIds.length == 0;

    if (!itemId) {
      itemId = await this._createItem(ctx, details, noCollections);
    } else {
      await this.updateItem(ctx, itemId, details);
    }

    if (!noCollections || removeMissingCollections)
      await this.saveItemCollections(
        ctx,
        itemId,
        collectionIds,
        removeMissingCollections
      );

    if (accessRequestId) {
      await this.accessRequestService.processAccessRequest(
        ctx,
        accessRequestId,
        "approved",
        null
      );
    }

    if (quickShareUserIds && quickShareUserIds.length > 0)
      await this.permissionService.shareItemWithUsers(
        ctx,
        itemId,
        quickShareUserIds
      );

    if (feedbackUpdate) {
      await this.updateItemFeedbackValue(
        ctx,
        itemId,
        feedbackUpdate.attr,
        feedbackUpdate.value
      );
    }

    return itemId;
  }


  // ROUTE-METHOD
  // TODO: Messy
  async saveItemCollections(
    ctx: RequestContext,
    itemId: string,
    collectionIds: Array<string> = [],
    removeMissingCollections = true,
    skipNotifications = false,
    subscriptionUpdate = false,
    orderLookup = {}
  ) {
    if (!itemId) {
      throw "Failed to save item.";
    }

    let item = await this.itemRepo.findById(itemId);

    let currColIds = await this.itemRelationService._getItemParentIdsForUser(
      ctx,
      ctx.currentUserId,
      itemId
    );

    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );
    if (!hasPermission) {
      throw new Error("No permission to edit item");
    }

    const currentUser = await ctx.getCurrentUser();
    if (!await ctx.isAdmin()) {
      currColIds = (
        await this.permissionService._filterToItemIdsWithPermissionForUser(
          currentUser._id, currColIds, PermissionTypeEditableList
        )
      )
    }

    const toAddColIds = collectionIds.filter(
      (a: string) => !currColIds.includes(a)
    );
    console.log("toAddIds", toAddColIds, "selectedIds", collectionIds);

    for (const cid of toAddColIds) {
      const order = orderLookup ? orderLookup[cid] : null;
      await this.itemRelationService._addItemToCollection(
        ctx,
        cid,
        itemId,
        item.type,
        order,
        subscriptionUpdate
      );
    }

    if (toAddColIds.length > 0) {
      const userData = currentUser.userData || {};
      let collectionIdHistory = userData["collectionIdHistory"] || [];
      collectionIdHistory = [...toAddColIds, ...collectionIdHistory].slice(
        0,
        5
      );
      userData["collectionIdHistory"] = collectionIdHistory;
      await this.users.updateWithId(ctx.currentUserId, { userData });
    }

    let toRemoveIds = [];


    if (removeMissingCollections) {
      toRemoveIds = currColIds.filter((a) => !collectionIds.includes(a));

    }


    //Check whos effected
    const removeUserIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(
      ctx,
      [...toRemoveIds]
    );

    if (toRemoveIds.length > 0) {
      for (const cid of toRemoveIds) {
        await this.itemRelationService.removeItemFromCollection(
          ctx,
          cid,
          itemId,
          subscriptionUpdate,
          true
        );
      }
    }

    const addUserIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(
      ctx,
      [...toAddColIds]
    );


    await this.changeLog.logLastUpdateForUsers(
      Array.from(new Set([...addUserIds, ...removeUserIds])),
      {
        type: "itemUpdate",
        items: [itemId],
      }
    );

    //send notifications
    if (!skipNotifications) {
      for (const userId of addUserIds) {
        if (userId == ctx.currentUserId || item.type == ItemType.collection)
          continue;
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
          notificationData
        );
      }
    }

    return;
  }

  // ROUTE-METHOD
  async updateItemFeedbackValue(
    ctx: RequestContext,
    itemId: string,
    attrName: string,
    value: any
  ) {


    if (!allowedAttributes.includes(attrName)) {
      throw new Error(`Invalid feedback attribute: ${attrName}`);
    }

    const feedback: ItemFeedback = {};

    // TODO: not ideal below
    //date attributes
    if (["isRead", "isReadLater", "reaction"].includes(attrName)) {
      const dateAttr = attrName + "Date";
      feedback[dateAttr] = value ? new Date() : null;
    } else if (attrName == "isStarred") {
      feedback.starredDate = value ? new Date() : null;
    }

    if (["reaction", "isHidden"].includes(attrName)) {
      feedback[attrName] = value;
    }

    if (attrName == "snoozeUntilDate") {
      feedback.snoozeUntilDate = value ? new Date(value) : null;
      feedback.neverRemindDate = null;
    }

    if (attrName == "neverRemindDate") {
      feedback.neverRemindDate = value ? new Date(value) : null;
      feedback.snoozeUntilDate = null;
    } else if (attrName == "archivedDate") {
      feedback.archivedDate = value ? new Date(value) : null;
      if (value) {
        feedback.snoozeUntilDate = null;
        feedback.neverRemindDate = null;
      }
    } else if (attrName == "isArchived") {
      feedback.archivedDate = value ? new Date() : null;
      if (value) {
        feedback.snoozeUntilDate = null;
        feedback.neverRemindDate = null;
      }
    }

    feedback.updatedAt = new Date();

    await this.feedbackService._updateItemFeedback(
      ctx.currentUserId,
      itemId,
      feedback
    );
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
    itemDetails: Item,
    options: { allowDecrypt: boolean; skipEncUpdate: boolean } = {
      allowDecrypt: false,
      skipEncUpdate: false,
    }
  ) {

    // verify permission
    const hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );

    if (!hasEditPermission) {
      throw new Error("No permission to edit item");
    }

    const now = new Date();
    let encrypted = checkIfItemIsEncrypted(itemDetails);

    const itemUpdates = getSanitizedItemForSaving(itemDetails);


    // don't update encInfo because it might not be an encypted field, so who cares
    if (options.skipEncUpdate && !itemUpdates.encInfo) {
      const itemDetailsUpdate = {
        ...itemUpdates,
        updatedAt: now,
      };

      await this.itemRepo.updateWithId(itemId, itemDetailsUpdate);
    } else {
      // check to make sure we have encInfo if we are updating an encrypted item, otherwise we will remove encInfo which is find for decrypting
      if (!options.allowDecrypt && !itemUpdates.encInfo) {
        let currentItem = await this.itemRepo.findById(itemId);
        if (currentItem.encInfo) {
          throw new Error("Item is encrypted, cannot update without encInfo");
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
    const userIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(
      ctx,
      [itemId]
    );

    await this.changeLog.logLastUpdateForUsers(userIds, {
      type: "itemUpdate",
      items: [itemId],
    });
  }

  async archiveItemUpdate(ctx: RequestContext, itemId: string, value: boolean) {
    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );

    if (!hasPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      await this.itemRepo.updateWithId(itemId, { archived: value });
    }
  }

  // ROUTE-METHOD
  async addItemAttachment(
    ctx: RequestContext,
    itemId: string,
    attachment: ItemAttachment
  ) {
    const hasPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );

    if (!hasPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        throw new Error("Item not found");
      }

      const attachmentData = item.attachments || { entries: [] };
      let attachments = attachmentData?.entries || [];

      // verify attachment has attributes
      const reqAttributes = ["id", "type"];
      for (const attr of reqAttributes) {
        if (!attachment[attr]) {
          throw new Error(`Attachment missing required attribute: ${attr}`);
        }
      }

      // if exists, remove existing
      const existingAttachment = attachments.find((a) => a.id == attachment.id);
      if (existingAttachment) {
        if (existingAttachment?.fileId) {
          try {
            await this.userFileService._removeUserFileById(
              ctx,
              existingAttachment.fileId
            );
          } catch (e) {
            console.error("Error removing file", e);
          }
        }

        attachments = attachments.filter((a) => a.id != existingAttachment.id);
      }

      attachment.createDate = Date.now();
      attachments.push(attachment);
      attachmentData.entries = attachments;
      await this.itemRepo.updateWithId(itemId, { attachments: attachmentData });
      return attachment;
    }
  }

  // ROUTE-METHOD
  async removeItemAttachment(ctx: RequestContext, itemId: string, id: string) {
    const hasEditPermission = await this.permissionService._hasEditPermissionDirectOrAsAdmin(
      ctx,
      itemId
    );

    if (!hasEditPermission) {
      throw new Error("User doesn't have permission to edit item");
    } else {
      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        throw new Error("Item not found");
      }

      const attachmentData = item.attachments || { entries: [] };
      const attachments = attachmentData.entries || [];

      const attachment = attachments.find((a) => a.id == id);

      if (attachment?.fileId) {
        try {
          await this.userFileService._removeUserFileById(ctx, attachment.fileId);
        } catch (e) {
          console.error("Error removing file", e);
        }
      }
      const newAttachments = attachments.filter((a) => a.id != id);
      attachmentData.entries = newAttachments;
      await this.itemRepo.updateWithId(itemId, { attachments: attachmentData });
    }
  }
}

export default ItemService;


