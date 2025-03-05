import { ItemRepo } from "@/db/item.repo";
import { ItemFeedbackRepo } from "@/db/item_feedback.repo";
import { ItemRelationRepo } from "@/db/item_relation.repo";
import knex from "@/db/knex_config";
import { UserPermRepo } from "@/db/user_perm.repo";
import { joinDataSetsByKey } from '@/utils/parse_utils';
import {
  ItemFeedbackView,
  ItemInfoView,
  ItemType,
  PermissionType
} from "tset-sharedlib/shared.types";
import FeedbackService from "./feedback.service";
import PermissionService from "./permission.service";
import { RequestContext } from "../base/request_context";
import { get } from "http";

const feedbackFields = [
  "reaction",
  "reactionDate",
  "isReadDate",
  "isReadLaterDate",
  "snoozeUntilDate",
  "archivedDate",
  "starredDate",
  "isHidden",
  "visitTime",
  "lastVisit",
  "visitCount",
];

const feedbackFieldNaming = feedbackFields.map((v) => "item_feedback." + v + " as " + v)

function getFeedbackData(v:any){
  return {
    reaction: v.reaction,
    reactionDate: v.reactionDate,
    isReadDate: v.isReadDate,
    isReadLaterDate: v.isReadLaterDate,
    starredDate: v.starredDate,
    isHidden: v.isHidden == true,
    snoozeUntilDate: v.snoozeUntilDate,
    archivedDate: v.archivedDate,
    visitTime: v.visitTime,
    lastVisit: v.lastVisit,
    visitCount: v.visitCount,
  } as ItemFeedbackView
}

class ItemListService {
  private feedbackService = new FeedbackService();

  private itemRepo = new ItemRepo();
  private itemRelations = new ItemRelationRepo();
  private permissionService = new PermissionService();
  public itemFeedbacks = new ItemFeedbackRepo();
  private permissions = new UserPermRepo();


  // ROUTE-METHOD
  // TODO: optimize
  async listArchived(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let explicitPermissions = await this.permissions
      .query()
      .from("item")
      .leftJoin("user_perm", "item._id", "=", "user_perm.itemId")
      .where(function () {
        this.where({ "item.userId": targetUserId } as any).orWhere({
          "user_perm.userId": targetUserId,
        } as any);
      })
     
      .where("item.archived", true)
      .select("item.*");

    // 1) first get all collections that can have children
    let collections = await this.permissions
      .query()
      .from("user_perm")
      .where({ "user_perm.userId": targetUserId } as any)
      .leftJoin("item", "item._id", "=", "user_perm.itemId")
      .where("item.type", "col")
      .select("item.*");

    // 2) get all items in those collections
    let items = await this.itemRepo
      .query()
      .from("item")
      .leftJoin("item_relation", "item_relation.itemId", "=", "item._id")
      // .leftJoin('item_meta', 'item._id', '=', 'item_meta._id')
      .where("item.archived", true)

      .where({ "item.userId": targetUserId } as any)
      .whereIn(
        "item_relation.collectionId",
        collections.map((v) => v._id)
      )
      .select("item.*");

    let allRecords = [...explicitPermissions, ...items];

    const set = new Set();
    allRecords = allRecords.filter((v: any) => {
      if (set.has(v._id)) return false;
      set.add(v._id);
      return true;
    });

    let itemIds = allRecords.map((v: any) => v._id);

    const itemFeedback = await this.feedbackService._getItemFeedbackByIds(
      targetUserId,
      itemIds
    );
    const feedbackLookup = {};
    for (const f of itemFeedback) {
      feedbackLookup[f.itemId] = f;
    }

    const resultItems = allRecords.map((v: any) => {
      return {
        itemId: v._id,
        details: v,
        feedback: feedbackLookup[v._id],
        collectionIds: v.parentCollectionIds,
      };
    });

    return resultItems;
  }

  // ROUTE-METHOD
  async listWithFeedback(
    ctx: RequestContext,
    targetUserId: string,
    feedbackType: string,
    limit: number
  ): Promise<ItemInfoView[]> {
    await ctx.verifyInAccount(targetUserId);

    // check feedback type
    if (!feedbackFields.includes(feedbackType)) {
      throw new Error("Invalid feedback type");
    }
    if (!limit || limit < 0) {
      limit = 1000;
    }

    let allRecords = await this.feedbackService.itemFeedbackRepo
      .query()
      .from("item_feedback")
      .where({ "item_feedback.userId": targetUserId } as any)
      .whereNotNull(`item_feedback.${feedbackType}`)
      .leftJoin("item", "item_feedback.itemId", "=", "item._id")
      .select(
        "item.*",
        ...feedbackFieldNaming
      )
      .orderBy(`item_feedback.${feedbackType}`, "desc")
      .limit(limit);

    const resultItems = allRecords;

    return resultItems
      .filter((v) => v._id != null)
      .filter(
        (v) =>
          !v.archived &&
          (feedbackType == "isHidden" ? v.isHidden == true : v.isHidden != true)
      )
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
          feedback: getFeedbackData(v),
        };
      });
  }


  // ROUTE-METHOD
  async listAllItemsWithInfoByUser(
    ctx: RequestContext,
    targetUserId: string
  ): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    //1) get items user has explicit permission to access
    let explicitPermission = await this.itemRepo
      .query()
      .from("item")
      .leftJoin("user_perm", "item._id", "=", "user_perm.itemId")
      .leftJoin("user", "user._id", "=", "user_perm.sharedByUserId")

      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "item._id").andOn(
          "item_feedback.userId",
          "=",
          knex.raw("?", [targetUserId])
        );
      })
      .where(function () {
        this.where({ "user_perm.userId": targetUserId } as any).orWhere({ "item.userId": targetUserId } as any)
      })
      .where(function () {
        this.where("item.archived", "<>", true).orWhereNull("item.archived");
      })
      .select(
        "item.*",
        "user_perm.createdAt as sharedAt",
        "user_perm.sharedByUserId as sharedByUserId",
        "user.username as sharedByUsername",
        ...feedbackFieldNaming
      );

    let collectionIds = explicitPermission
      .filter((v) => v.type === "col")
      .map((v) => v._id);

    //2) get all items in those collections
    let childItems = await this.itemRelations
      .query()
      .from("item_relation")
      .leftJoin("item", "item._id", "=", "item_relation.itemId")

      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "item_relation.itemId").andOn(
          "item_feedback.userId",
          "=",
          knex.raw("?", [targetUserId])
        );
      })
      .where(function () {
        this.where("item.archived", "<>", true).orWhereNull("item.archived");
      })
      .whereIn("item_relation.collectionId", collectionIds)
      .select(
        "item.*",
        "item_relation.collectionId as parentCollectionId",
        ...feedbackFieldNaming
      );

    let allRecordsWithDups = [...explicitPermission, ...childItems];


    // group and collect parentCollectionIds
    const itemLookup = {};
    for (const item of allRecordsWithDups) {
      const currentItem = itemLookup[item._id];
      if (!currentItem) {
        item["parentCollectionIds"] = [];
        if (!!item.parentCollectionId) {
          item["parentCollectionIds"].push(item.parentCollectionId);
        }
        itemLookup[item._id] = item;
      } else {
        if (item.parentCollectionId) {
          currentItem["parentCollectionIds"].push(item.parentCollectionId);
        }
      }
    }
    let allRecords = Object.values(itemLookup);

    const resultItems = allRecords
      .map((v: any) => {
        return {
          itemId: v._id,
          details: v,
          feedback: getFeedbackData(v),
          collectionIds: v.parentCollectionIds,
        };
      })
      .filter((v) => v.feedback?.isHidden != true);

    return resultItems;
  }


  // ROUTE-METHOD
  async listItemsWithInfoByUserForItemIds(
    ctx: RequestContext,
    targetUserId: string,
    requestedItemIdsSet: Set<string>
  ): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    let requestedItemIds = Array.from(requestedItemIdsSet);

    // Get all items requested
    let items = await this.itemRepo
      .query()
      .from("item")
      .leftJoin("item_feedback", function () {
        this.on(
          "item_feedback.itemId",
          "=",
          "item._id"
        ).andOnIn("item_feedback.userId", [targetUserId]);
      })
      .whereIn("item._id", requestedItemIds)
      .where(function () {
        this.where("item.archived", "<>", true).orWhereNull("item.archived");
      })
      .select(
        "item.*",
        ...feedbackFieldNaming
      );


    let nonCollections = items.filter((v) => v.type != ItemType.collection);
    let nonCollectionIds = nonCollections.map((v) => v._id);

    // Get parents of items (collections must get explict permission)
    let itemParents = await this.itemRelations
      .query()
      .from("item_relation")
      .whereIn("itemId", nonCollectionIds)
      .select("_id", "itemId", "collectionId");


    // Create parent lookup
    let parentMap = {};
    for (const p of itemParents) {
      if (!p.collectionId) continue;

      if (p.itemId in parentMap) {
        parentMap[p.itemId].push(p.collectionId);
      } else {
        parentMap[p.itemId] = [p.collectionId];
      }
    }
    let parentIds = itemParents.map((v) => v.collectionId);


    // Get permissions for items and parents
    let directItemAndParentPerms = await this.permissions
      .query()
      .from("user_perm")
      .where({ "user_perm.userId": targetUserId } as any)
      .whereIn("itemId", [...requestedItemIds, ...parentIds])
      .select("itemId", "permission");



    let directPermLookup = Object.fromEntries(
      directItemAndParentPerms.map((v) => [v.itemId, v.permission])
    );

    // (note: owner has permission)
    let itemIdsWithPermSet = new Set(
      items.filter((v) => (v._id in directPermLookup) || (targetUserId == v?.userId)).map((v) => v._id)
    );

    let itemIdsWithoutDirectPerm = requestedItemIds.filter((v) => itemIdsWithPermSet.has(v) == false);

    // check if user has access to any parent
    if (itemIdsWithoutDirectPerm.length > 0) {
      for (let itemId of itemIdsWithoutDirectPerm) {
        let parents = parentMap[itemId] || [];

        let hasPerm = parents.some((p) => p in directPermLookup);
        if (hasPerm) {
          itemIdsWithPermSet.add(itemId);
        }
      }
    }

    // Filter out items without permission
    let allRecords = items.filter((v) => itemIdsWithPermSet.has(v._id));

    // Double check for duplicates and remove duplicates
    // create set for fast lookup
    const set = new Set();
    allRecords = allRecords.filter((v: any) => {
      if (set.has(v._id)) return false;
      set.add(v._id);
      return true;
    });

    const resultItems = allRecords
      .map((v: any) => {

        let collectionIds = []
        if (v._id in parentMap) collectionIds = parentMap[v._id]
        
        return {
          itemId: v._id,
          details: v,
          collectionIds: collectionIds,
          feedback: getFeedbackData(v),

        };
      })
      .filter((v) => v.feedback?.isHidden != true);

    return resultItems;
  }

  // ROUTE-METHOD
  async listItemsWithIdAndInAccount(ctx: RequestContext, ids: string[]) {
    return await this.itemRepo.findWhereIdInAndInAccount(ids, ctx.accountId);
  }

  async listLibraryCollectionsRoot(
    ctx: RequestContext,
    targetUserId: string,
    includeUserPermissions = false,
    limit = null
  ): Promise<ItemInfoView[]> {
    await ctx.verifyInAccount(targetUserId);

    let isSelfOrUserAdmin = await ctx.isSelfOrAdminOfUser(targetUserId);


    let allRecordsQuery = this.permissions
      .query()
      .from("item")
      .leftJoin("user_perm", "item._id", "=", "user_perm.itemId")
      .where(function () {
        this.where({ "item.userId": targetUserId } as any).orWhere({
          "user_perm.userId": targetUserId,
        } as any);
      })
      .leftJoin(
        "item_relation",
        "item_relation.itemId",
        "=",
        "user_perm.itemId"
      )
      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "user_perm.itemId").andOn(
          "item_feedback.userId",
          "=",
          "user_perm.userId"
        );
      })
      .where("item.type", "col")

      .select(
        "item.*",
        "item_relation.collectionId as parentId",
        "user_perm.permission as permission",
        "user_perm.userId as permissionUserId",
        "user_perm.createdAt as permissionCreatedAt",
        ...feedbackFieldNaming
      )
      .orderBy("item.name", "asc");

    if (!isSelfOrUserAdmin) {
      allRecordsQuery = allRecordsQuery.where("item.visibility", "shared");
    }

    allRecordsQuery = allRecordsQuery.limit(limit || 800);

    let allRecords = await allRecordsQuery;

    // set owner permission
    allRecords.forEach((v) => {
      if (v.userId == ctx.currentUserId) {
        v.permission = PermissionType.owner;
        v.permissionUserId = ctx.currentUserId;
      }
    });

    const permissionLookup = Object.fromEntries(
      allRecords.map((v) => {
        return [v._id, v.permission];
      })
    );

    const parentLookup = {};
    allRecords.forEach((v) => {
      if (v.parentId) {
        if (v._id in parentLookup) {
          parentLookup[v._id].push(v.parentId);
        } else {
          parentLookup[v._id] = [v.parentId];
        }
      }
    });

    const addedSet = new Set();

    allRecords = allRecords.filter((v) => {
      if (addedSet.has(v._id)) return false;
      addedSet.add(v._id);
      const parents = parentLookup[v._id] || [];
      const hasParent = parents.some((p) => p in permissionLookup);
      const keep = !hasParent;

      return keep;
    });

    for (const col of allRecords) {
      col["parents"] = [];
    }

    const userCollectionIds = allRecords.map((v) => v._id);

    //TODO: optimize
    if (includeUserPermissions) {
      const allPermissionLookup = await this.permissionService._getPermissionLookupForAccountUsers(
        ctx.accountId,
        userCollectionIds
      );
      for (const col of allRecords) {
        col["allPerms"] = allPermissionLookup[col._id];
      }
    }

    const resultItems = allRecords
      .filter((v) => !v.archived && v.isHidden != true)
      .map((v) => {
        return {
          itemId: v._id,
          details: v, 
          feedback: getFeedbackData(v),
        };
      });
    return resultItems;
  }

  // ROUTE-METHOD
  async getUncategorizedList(
    ctx: RequestContext,
    targetUserId: string
  ): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdmin(targetUserId);
    //for those items that have no permissions
    let noPermissions = await this.itemRepo
      .query()
      .from("item")
      .leftJoin("item_relation", "item_relation.itemId", "=", "item._id")
      .leftJoin("user_perm", "item._id", "=", "user_perm.itemId")
      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "user_perm.itemId").andOn(
          "item_feedback.userId",
          "=",
          "user_perm.userId"
        );
      })
      .where(function () {
        this.where({ "item.userId": targetUserId } as any).orWhere({
          "user_perm.userId": targetUserId,
        } as any);
      })
      .select(
        "item.*",
        "item_relation.collectionId as parentId",
        "user_perm.permission as permission"
      )
      .orderBy("item.createdAt", "desc");

    let allRecords = [...noPermissions].filter((v) => v.type != "col");

    let userParentIds = new Set(
      [...noPermissions].filter((v) => v.type == "col").map((v) => v._id)
    );

    // Create a lookup for all parents
    const parentLookup = {};
    allRecords.forEach((v) => {
      if (v.parentId) {
        if (v._id in parentLookup) {
          parentLookup[v._id].push(v.parentId);
        } else {
          parentLookup[v._id] = [v.parentId];
        }
      }
    });

    // Filter out items that have a parent with permission
    const addedSet = new Set();
    const resultItems = allRecords.filter((v) => {
      if (addedSet.has(v._id)) return false;
      addedSet.add(v._id);
      const parents = parentLookup[v._id] || [];
      const hasParent = parents.some((p: string) => userParentIds.has(p));
      const keep = !hasParent;
      return keep;
    });

    let itemIds = allRecords.map((v) => v._id);

    const itemFeedback = await this.feedbackService._getItemFeedbackByIds(
      targetUserId,
      itemIds
    );
    const feedbackLookup = {};
    for (const f of itemFeedback) {
      feedbackLookup[f.itemId] = getFeedbackData(f);
    }

    return resultItems
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
          feedback: feedbackLookup[v._id],
        };
      })
      .filter((v) => v.feedback?.isHidden != true);
  }



  // ROUTE-METHOD
  async listItemsWithInfoByCollectionId(
    ctx: RequestContext,
    targetUserId: string,
    collectionId: string,
    typeFilter = null,
    hideArchived = true
  ): Promise<ItemInfoView[]> {
    if (!collectionId) return [];

    await ctx.verifySelfOrAdminOverUser(targetUserId);
    const collection = await ctx.getItemById(collectionId);

    if (!collection || collection.deleted) {
      throw new Error("Invalid collection");
    }

    // Perm to collection
    // - OK if is shared and in account
    // - OK if direct permission

    let hasPermission: boolean = false;


    //TODO: this needs to be replaced because we can't depend on accountId
    let permMessage = "You don't have permission to list this collections items.";
    if (
      collection.visibility == "shared" &&
      collection.accountId == ctx.accountId
    ) {
      hasPermission = true;
    } else {

      const permLookup = await this.permissionService._getPermissionLookupForItem(
        ctx, collectionId, false, true);
  
      if (targetUserId in permLookup) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      throw new Error(permMessage);
    }

    let query = this.itemRelations
      .query()
      .from("item_relation")
      .leftJoin("item", "item._id", "=", "item_relation.itemId")
      .leftJoin("item_feedback", function () {
        this.on(
          "item_feedback.itemId",
          "=",
          "item_relation.itemId"
        ).andOnIn("item_feedback.userId", [targetUserId]);
      })
      .where({ "item_relation.collectionId": collectionId } as any)
      .select(
        "item.*",
        "item_relation._id as collectionRelationId",
        "item_relation.collectionId as parentId",
        "item_relation.itemType as itemType",
        "item_relation.publishedUpdatedAt as publishedUpdatedAt",
        "item_relation.publishedAvailableAt as publishedAvailableAt",
        "item_relation.details as itemRelationDetails",
        "item_relation.encrypted as relationEncrypted",
        "item_relation.order as order",
        ...feedbackFieldNaming
      )
      .orderBy("order", "desc");

    if (typeFilter) {
      query = query.where("item_relation.itemType", typeFilter);
    }

    let resultItems = await query;

    let itemIds = resultItems.map((v) => v._id);

    const directPermLookup = await this.permissionService._getDirectPermissionLookupForItemIdsExcludingOwner(
      targetUserId,
      itemIds
    );

    const isAdmin = await ctx.isAdmin();

    resultItems = resultItems.filter((v) => {
      return (
        v.type != ItemType.collection ||
        v._id in directPermLookup ||
        v.visibility == "shared" ||
        isAdmin
      );
    });
    let missingItemsRelationIds = resultItems
      .filter((v) => v._id == null)
      .map((v) => v.collectionRelationId);
    // Clean up
    this.itemRelations
      .deleteWhereIn("_id", missingItemsRelationIds)
      .catch((e) => {
        console.error("Error cleaning up missing items", e);
      });

    return resultItems
      .filter(
        (v) =>
          (!hideArchived || v.archived != true) &&
          v?.isHidden != true &&
          !!v._id
      )
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
          collectionRelation: {
            _id: v.collectionRelationId,
            collectionId: v.parentId,
            itemType: v.itemType,
            publishedUpdatedAt: v.publishedUpdatedAt,
            publishedAvailableAt: v.publishedAvailableAt,
            details: v.itemRelationDetails,
            encrypted: v.relationEncrypted,
            encInfo: v.encInfo,
            order: v.order,
          },
          feedback: getFeedbackData(v),
        };
      });
  }


  async getItemsByIds(accountId, itemIds) {
    return await this.itemRepo.findWhereIdInAndInAccount(itemIds, accountId);
  }

  async listSharedWithUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let items = await this.permissions
      .query()
      .from("user_perm")
      .where({ "user_perm.userId": targetUserId } as any)
      .whereNotNull("user_perm.sharedByUserId")

      .whereNot("user_perm.sharedByUserId", targetUserId)
      .leftJoin("item", "item._id", "=", "user_perm.itemId")
      .leftJoin("user", "user._id", "=", "user_perm.sharedByUserId")
      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "item._id").andOn(
          "item_feedback.userId",
          "=",
          "user_perm.userId"
        );
      })
      .select(
        "item.*",
        "user_perm.createdAt as sharedAt",
        "user_perm.sharedByUserId as sharedByUserId",
        "user.username as sharedByUsername",
        ...feedbackFieldNaming
      )
      .orderBy("sharedAt", "desc");

    return items.map((v) => {
      return {
        itemId: v._id,
        details: v,
        feedback: getFeedbackData(v),
      };
    });
  }

  async listSharedByUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let items = await this.permissions
      .query()
      .from("user_perm")
      .where({ "user_perm.sharedByUserId": targetUserId } as any)
      .whereNot("user_perm.userId", targetUserId)
      .leftJoin("item", "item._id", "=", "user_perm.itemId")
      .leftJoin("user", "user._id", "=", "user_perm.userId")
      .leftJoin("item_feedback", function () {
        this.on("item_feedback.itemId", "=", "item._id").andOn(
          "item_feedback.userId",
          "=",
          "user_perm.sharedByUserId"
        );
      })
      .select(
        "item.*",
        "user_perm.createdAt as sharedAt",
        "user_perm.userId as sharedWithUserId",
        "user.username as sharedWithUsername",
        ...feedbackFieldNaming
      )
      .orderBy("sharedAt", "desc");

    return items.map((v) => {
      return {
        itemId: v._id,
        details: v,
        feedback: getFeedbackData(v),
      };
    });
  }
}

export default ItemListService;
