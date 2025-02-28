import { Routes } from "@interfaces/routes.interface";
import express, { Router } from "express";

import {
  authenticateJWT,
  errorHelper,
  getTargetUserId,
} from "../utils/auth_utils";

import ItemService from "@/services/item.service";
import { RequestContext } from "@/base/request_context";
import PermissionService from "@/services/permission.service";
import ItemListService from "@/services/item.list.service";
import ItemRelationService from "@/services/item.relations";
import ChangeLogService from "@/services/change_log.service";
import * as ItemPaths from 'tset-sharedlib/api/ItemPaths';

class ItemRoute implements Routes {
  public router = Router();

  private changeLogService = new ChangeLogService();

  private permissionService = new PermissionService();

  private itemService = new ItemService();

  private itemlistService = new ItemListService();

  private itemRelationService = new ItemRelationService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    

    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_INFO_BY_ID,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const itemId = req.body.itemId;
        const results = await this.itemService.getItemInfoById(
          RequestContext.instance(req),
          itemId,
          req.body.detailsOnly
        );

        const result = {
          success: true,
          results: results || {},
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_DELETE,
      authenticateJWT,
      errorHelper(async (req, res) => {

        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.itemId,req.body.collectionId],
          async () => {
            return await this.itemService.deleteItem(
              RequestContext.instance(req),
              req.body.itemId
            );
          }
        );
        
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {

        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.itemId,req.body.collectionId],
          async () => {
            return await this.itemRelationService.removeItemFromCollection(
              ctx,
              req.body.collectionId,
              req.body.itemId
            );
          }
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.REMOVE_RELATION,
      authenticateJWT,
      errorHelper(async (req, res) => {

        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.collectionId],
          async () => {
            return await this.itemRelationService.removeItemFromCollectionWithRelationId(
              ctx,
              req.body.collectionId,
              req.body.relationId
            );
          }
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.post(
      ItemPaths.ARCHIVE_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {


        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.itemId],
          async () => {
            return await this.itemService.archiveItemUpdate(
              ctx,
              req.body.itemId,
              !!req.body.value
            );
          }
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-FAILED
    // TODO: Should make sure user can delete items in collection
    this.router.post(
      ItemPaths.COLLECTION_REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.collectionId],
          async () => {
            return await this.itemService.removeCollectionById(
              ctx,
              req.body.collectionId,
              req.body.deleteItems
            );
          }
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-TOCHECK
    // TODO: Should check permissions new collections
    this.router.post(
      ItemPaths.COLLECTIONS_SAVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.saveItemCollections(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.collectionIds,
          req.body.removeMissingCollections
        );

        // NOTE: change log is updated inside function
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    // TODO: remove above?
    this.router.post(
      ItemPaths.ITEM_SAVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.itemService.saveItem(
          ctx,
          req.body.itemId,
          req.body.details,
          req.body.collectionIds,
          req.body.removeMissingCollections,
          req.body.quickShareUserIds,
          req.body.accessRequestId,
          req.body.feedbackUpdate
        );

        // NOTE: change log updates happen in function call
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.itemService.updateItem(
          ctx,
          req.body.itemId,
          req.body.data,
          {
            allowDecrypt: req.body.allowDecrypt == true,
            skipEncUpdate: req.body.skipEncUpdate == true,
          }
        );

        // TODO: this is partiallyredundant since similar thing happens above function
        await this.changeLogService.logItemChange(
          ctx,
          req.body.itemId,
          null
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ATTACHMENT_ADD,

      express.urlencoded({
        limit: "50mb",
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.addItemAttachment(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.attachment
        );
        res.json({
          success: true,
          results: results,
        });
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.ATTACHMENT_REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.removeItemAttachment(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.attachmentId
        );
        res.json({
          success: true,
          results: results,
        });
      })
    );

    this.router.post(
      ItemPaths.FEEDBACK_VALUE_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.updateItemFeedbackValue(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.attr,
          req.body.value
        );
        await this.changeLogService.logItemChange(
          RequestContext.instance(req),
          req.body.itemId,
          null
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ADD_TO_COLLECTIONS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemRelationService.updateItemToCollectionMembership(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.collectionIds,
          req.body.removeCollectionIds
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.PARENTS_BY_CHILD_ID,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.getParentItemsForUser(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
          req.body.includePath
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.LIBRARY_ROOT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listLibraryCollectionsRoot(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.includeUserPermissions,
          req.body.limit
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.LIBRARY_UNCATEGORIZED,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.getUncategorizedList(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.LIBRARY_ARCHIVED,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listArchived(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.LIST_WITH_FEEDBACK,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listWithFeedback(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.feedbackType,
          req.body.limit
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_REMOVE_FROM_USER_LIBRARY,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);

        await this.itemService.removeUserCollections(
          ctx,
          getTargetUserId(req),
          req.body.collectionIds,
          req.body.fullRemove
        );

        if (req.body.collectionIds)
          for (const colId of req.body.collectionIds) {
            await this.changeLogService.logItemChange(
              ctx,
              colId
            );
          }

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      })
    );

    // TODO: Do i need both this and below?
    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_LIST_BY_ACCOUNT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.listCollectionsByAccount(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.ids,
          req.body.includePath,
          req.body.includeUserPermissions
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // TODO: Do i need both this and above?
    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_LIST_BY_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const items = await this.itemService.listUserCollections(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.permissionsIncluded,
          req.body.sharedOnly,
          req.body.includePath,
          req.body.includeUserPermissions,
          req.body.includeParents
        );
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      })
    );
    // this.router.post(
    //   ItemPaths.COLLECTION_LIST_VISIBLE_BY_USER,
    //   authenticateJWT,
    //   errorHelper(async (req, res) => {
    //     const items = await this.itemService.getSharedCollectionsByUser(
    //       RequestContext.instance(req),
    //       getTargetUserId(req),
    //       req.body.limit
    //     );
    //     const result = {
    //       success: true,
    //       results: items,
    //     };
    //     res.json(result);
    //   }),
    // );


    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_INFO_BY_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.getCollectionById(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.includeUserPermissions,
          req.body.includeFeedback
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_LIST_ITEMS_WITH_INFO_BY_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listItemsWithInfoByCollectionId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.collectionId,
          req.body.typeFilter
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_GET_ITEM_REL_INFO,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemRelationService.getItemRelationInfo(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemId
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_PATH_TREE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.getPathTree(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );



    // SCH-OK
    this.router.post(
      ItemPaths.COLLECTION_CREATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemService.createCollection(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.data,
          {
            collectionIds: req.body.collectionIds,
            permList: req.body.permList,
            customPermissions: req.body.customPermissions,
            skipNotifications: req.body.skipNotifications,
          }
        );
        res.json({
          success: true,
          results: results,
        });
      })
    );

    this.router.post(
      ItemPaths.COLLECTION_ITEM_DETAILS_SAVE,
      authenticateJWT,
      errorHelper(async (req, res) => {

        const results = await this.itemRelationService.saveCollectionItemDetails(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemId,
          req.body.details,
          req.body.publishedAvailableAt,
          req.body.encInfo
        );
        await this.changeLogService.logItemChange(
          RequestContext.instance(req),
          req.body.collectionId
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.post(
      ItemPaths.COLLECTION_ORDER_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemRelationService.updateCollectionItemOrder(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemIds
        );
        await this.changeLogService.logItemChange(
          RequestContext.instance(req),
          req.body.collectionId
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_LIST_WITH_INFO_BY_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        let itemIds = req.body.ids;
        let items = [];
        console.log("itemIds", itemIds);
        if (!itemIds || itemIds.length == 0) {
          items = await this.itemlistService.listAllItemsWithInfoByUser(
            RequestContext.instance(req),
            getTargetUserId(req)
          );
        } else {
          items = await this.itemlistService.listItemsWithInfoByUserForItemIds(
            RequestContext.instance(req),
            getTargetUserId(req),
            itemIds
          );
        }
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_BY_IDS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const items = await this.itemlistService.listItemsWithIdAndInAccount(
          RequestContext.instance(req),
          req.body.ids
        );
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_QUICKBAR_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.itemService.updateQuickBar(
          RequestContext.instance(req),
          req.body.itemId
        );
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_UPDATE_PERMISSIONS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.updateItemPermissions(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.permissionUpdates
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );




    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_SET_USER_PERMISSION,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.setUserPermission(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
          req.body.permission
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.post(
      ItemPaths.ITEM_SHARE_WITH_USERS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.shareItemWithUsers(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.userIds,
          req.body.permission,
          false
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.post(
      ItemPaths.ITEM_LIST_SHARED_WITH_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listSharedWithUser(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );
    this.router.post(
      ItemPaths.ITEM_LIST_SHARED_BY_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.itemlistService.listSharedByUser(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );
    this.router.post(
      ItemPaths.ITEM_PERMISSIONS_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.listPermissionsToItemWithUserDetails(
          RequestContext.instance(req),
          req.body.itemId
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // TODO: Weird combination of permissions and reactions
    this.router.post(
      ItemPaths.ITEM_PERMISSIONS_AND_REACTIONS_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.listPermissionsAndReactions(
          RequestContext.instance(req),
          req.body.itemId
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );




    // SCH-OK
    this.router.post(
      ItemPaths.ITEM_USER_PERMISSION_LOOKUP,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService.getUserPermissionLookup(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.post(
      ItemPaths.ITEM_TRANSFER_OWNERSHIP,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.permissionService._assignItemOwner(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );
  }
}

export default ItemRoute;
