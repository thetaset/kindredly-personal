import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId, removeNullFields} from '../utils/auth_utils';

import ItemService from '@/services/item.service';
import {RequestContext} from '@/base/request_context';
import PermissionService from '@/services/permission.service';
import ItemListService from '@/services/item.list.service';
import ItemRelationService from '@/services/item.relations';
import ChangeLogService from '@/services/change_log.service';
import {SyncType} from '@/db/user_changelog.repo';
import ItemQueryService from '@/services/item.query.service';
import ItemMergeService from '@/services/item.merge.service';
import {RefStateRepo} from '@/db/ref_state.repo';
import {RefStateService} from '@/services/ref_state.service';
import type {ItemImageApproval} from 'tset-sharedlib/api';

const ITEM_FAMILY_POLICY_STATE_KEY = 'family_policy';
const ITEM_FAMILY_POLICY_STATE_SUB_KEY = '';

function normalizeItemImageApproval(data: any): ItemImageApproval | null {
  const imageCensoring = data?.imageCensoring;
  if (!imageCensoring || imageCensoring.skipApproved !== true) {
    return null;
  }

  return {
    approved: true,
    updatedAt: typeof imageCensoring.updatedAt === 'number' ? imageCensoring.updatedAt : undefined,
    updatedByUserId: typeof imageCensoring.updatedByUserId === 'string' ? imageCensoring.updatedByUserId : null,
  };
}

function buildNextItemFamilyPolicy(existingData: any, approved: boolean, currentUserId: string | undefined) {
  const nextPolicy = existingData && typeof existingData === 'object' ? {...existingData} : {};

  if (!approved) {
    delete nextPolicy.imageCensoring;
    return Object.keys(nextPolicy).length > 0 ? nextPolicy : null;
  }

  const currentImageCensoring =
    nextPolicy.imageCensoring && typeof nextPolicy.imageCensoring === 'object' ? nextPolicy.imageCensoring : {};

  return {
    ...nextPolicy,
    imageCensoring: {
      ...currentImageCensoring,
      skipApproved: true,
      updatedAt: Date.now(),
      updatedByUserId: currentUserId || null,
    },
  };
}

class ItemRoute implements Routes {
  public router = Router();

  private changeLogService = new ChangeLogService();

  private permissionService = new PermissionService();

  private itemService = new ItemService();

  private itemlistService = new ItemListService();

  private itemRelationService = new ItemRelationService();

  private itemQueryService = new ItemQueryService();

  private itemMergeService = new ItemMergeService();

  private refStateService = new RefStateService();

  private refStateRepo = new RefStateRepo();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private async canAccessSameAccountItemFamilyPolicy(ctx: RequestContext, itemId: string): Promise<boolean> {
    const hasPermission = await this.permissionService._hasAnyPermissionDirectOrAsAdmin(ctx, itemId);
    if (!hasPermission) {
      return false;
    }

    const item = await ctx.getItemById(itemId);
    return !!item && item.accountId === ctx.accountId;
  }

  private async getItemImageApproval(ctx: RequestContext, itemId: string): Promise<ItemImageApproval | null> {
    const canAccess = await this.canAccessSameAccountItemFamilyPolicy(ctx, itemId);
    if (!canAccess) {
      return null;
    }

    const {entries} = await this.refStateService.list(ctx, 'account', {
      refType: 'item',
      refId: itemId,
      stateKey: ITEM_FAMILY_POLICY_STATE_KEY,
      stateSubKey: ITEM_FAMILY_POLICY_STATE_SUB_KEY,
      limit: 1,
    });

    return normalizeItemImageApproval(entries[0]?.data);
  }

  private initializeRoutes() {
    // SCH-OK
    // CONSOLIDATED: Handles both items and collections (merged from /item/infoById)
    this.router.post(
      '/item/infoById',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/infoById'>, res) => {
        const itemId = req.body.itemId;
        const results = await this.itemService.getItemInfoById(
          RequestContext.instance(req),
          itemId,
          req.body.detailsOnly,
          req.body.includeUserPermissions,
          req.body.includeFeedback,
        );

        const result = {
          success: true,
          results: results || {},
        };
        res.json(removeNullFields(result));
      }),
    );

    this.router.post(
      '/item/duplicates/merge',
      express.json({limit: '70mb'}),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/duplicates/merge'>, res) => {
        const results = await this.itemMergeService.merge(RequestContext.instance(req), req.body);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/item/reactions/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/reactions/list'>, res) => {
        const results = await this.itemService.listItemReactions(RequestContext.instance(req), req.body.itemId);

        res.json({
          success: true,
          results: results || [],
        });
      }),
    );

    this.router.post(
      '/item/familyPolicy/imageApproval/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/familyPolicy/imageApproval/get'>, res) => {
        const ctx = RequestContext.instance(req);
        const approval = await this.getItemImageApproval(ctx, req.body.itemId);

        res.json({
          success: true,
          results: {
            itemId: req.body.itemId,
            approval,
          },
        });
      }),
    );

    this.router.post(
      '/item/familyPolicy/imageApproval/set',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/familyPolicy/imageApproval/set'>, res) => {
        const ctx = RequestContext.instance(req);
        await ctx.verifyCurrentUserIsAdmin();

        const canAccess = await this.canAccessSameAccountItemFamilyPolicy(ctx, req.body.itemId);
        if (!canAccess) {
          throw new Error('No permission to manage family policy for item');
        }

        const {entries} = await this.refStateService.list(ctx, 'account', {
          refType: 'item',
          refId: req.body.itemId,
          stateKey: ITEM_FAMILY_POLICY_STATE_KEY,
          stateSubKey: ITEM_FAMILY_POLICY_STATE_SUB_KEY,
          limit: 1,
        });

        const nextPolicy = buildNextItemFamilyPolicy(
          entries[0]?.data,
          req.body.approved === true,
          ctx.getCurrentUserId(),
        );

        if (nextPolicy) {
          await this.refStateService.upsert(ctx, 'account', {
            refType: 'item',
            refId: req.body.itemId,
            stateKey: ITEM_FAMILY_POLICY_STATE_KEY,
            stateSubKey: ITEM_FAMILY_POLICY_STATE_SUB_KEY,
            data: nextPolicy,
          });
        } else {
          await this.refStateService.delete(ctx, 'account', {
            refType: 'item',
            refId: req.body.itemId,
            stateKey: ITEM_FAMILY_POLICY_STATE_KEY,
            stateSubKey: ITEM_FAMILY_POLICY_STATE_SUB_KEY,
          });
        }

        res.json({
          success: true,
          results: {
            itemId: req.body.itemId,
            approval: normalizeItemImageApproval(nextPolicy),
          },
        });
      }),
    );

    this.router.post(
      '/item/familyPolicy/imageApproval/listByIds',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/familyPolicy/imageApproval/listByIds'>, res) => {
        const ctx = RequestContext.instance(req);
        const dedupedItemIds = Array.from(
          new Set(
            (Array.isArray(req.body.itemIds) ? req.body.itemIds : []).filter((itemId): itemId is string => !!itemId),
          ),
        ).slice(0, 200);

        const accessibleSameAccountItemIds: string[] = [];
        for (const itemId of dedupedItemIds) {
          if (await this.canAccessSameAccountItemFamilyPolicy(ctx, itemId)) {
            accessibleSameAccountItemIds.push(itemId);
          }
        }

        if (accessibleSameAccountItemIds.length === 0 || !ctx.accountId) {
          res.json({
            success: true,
            results: {
              approvedItemIds: [],
              approvals: [],
            },
          });
          return;
        }

        const rows = await this.refStateRepo.listByRefs({
          refType: 'item',
          refIds: accessibleSameAccountItemIds,
          ownerType: 'account',
          ownerId: ctx.accountId,
          stateKey: ITEM_FAMILY_POLICY_STATE_KEY,
          stateSubKey: ITEM_FAMILY_POLICY_STATE_SUB_KEY,
        });

        const approvals = rows
          .map((row) => {
            const approval = normalizeItemImageApproval(row.data);
            if (!approval) {
              return null;
            }

            return {
              itemId: row.refId,
              approval,
            };
          })
          .filter((entry): entry is {itemId: string; approval: ItemImageApproval} => !!entry);

        res.json({
          success: true,
          results: {
            approvedItemIds: approvals.map((entry) => entry.itemId),
            approvals,
          },
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/delete',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/delete'>, res) => {
        const ctx = RequestContext.instance(req);
        const item = await ctx.getItemById(req.body.itemId);
        if (!item && req.body.itemId) {
          // Already gone: deleted on another device, or this delete sent again after its first
          // answer was lost (OFS-3). Nothing to delete or log; deleteItem answers the same.
          res.json({success: true, results: true});
          return;
        }
        const actingUserId = ctx.getActingUserId() || ctx.currentUserId;
        const isOwner = !!item && !!actingUserId && item.userId === actingUserId;

        if (!isOwner) {
          await ctx.verifyCurrentUserIsAdmin();
        }

        const itemIdsForChangelog = await this.itemService.previewDeleteItemIds(
          ctx,
          req.body.itemId,
          req.body.deleteChildren,
        );

        const results = await this.changeLogService.logRemovalOfItems(ctx, itemIdsForChangelog, async () => {
          return await this.itemService.deleteItem(
            RequestContext.instance(req),
            req.body.itemId,
            req.body.deleteChildren,
          );
        });

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/removeFromParent',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/removeFromParent'>, res) => {
        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.itemId], async () => {
          return await this.itemRelationService.removeItemFromCollection(ctx, req.body.collectionId, req.body.itemId);
        });
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/archiveUpdate',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/archiveUpdate'>, res) => {
        const ctx = RequestContext.instance(req);

        const results = await this.changeLogService.logRemovalOfItems(ctx, [req.body.itemId], async () => {
          return await this.itemService.archiveItemUpdate(ctx, req.body.itemId, !!req.body.value);
        });

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/archiveMany',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/archiveMany'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.itemService.archiveItems(
          ctx,
          req.body.itemIds,
          !!req.body.value,
          !!req.body.includeShared,
        );
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/update',
      // Excluded from app-level parsers (see app.ts bigBodyPaths): like
      // /item/save, item `data` can carry large inline content. Preserves the
      // prior 70mb ceiling. Parser must precede auth (reads tempAuthToken).
      express.json({limit: '70mb'}),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/update'>, res) => {
        const ctx = RequestContext.instance(req);
        const {itemId, data, allowDecrypt, skipEncUpdate, ifUpdatedAt, nudge} = req.body;

        const results = await this.itemService.updateItem(ctx, itemId, data, {
          allowDecrypt: allowDecrypt == true,
          skipEncUpdate: skipEncUpdate == true,
          ifUpdatedAt,
          // Only an explicit false: a note's text upload follows and nudges (SYNC-15).
          nudge: nudge !== false,
        });

        // No changelog call here: updateItem logs it, through the same wider
        // recipient lookup this route used to compensate with. SYNC-2.

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Tell the people on a collection about an item already in it. The popup saves the moment
    // a collection is picked, so this is how a "Let them know" ticked afterwards still lands.
    this.router.post(
      '/item/notifyAddedToCollections',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/notifyAddedToCollections'>, res) => {
        await this.itemService.notifyAddedToCollections(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.collectionIds,
        );
        res.json({success: true});
      }),
    );

    // SCH-TOCHECK
    // TODO: Should check permissions new collections
    this.router.post(
      '/item/updateParents',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/updateParents'>, res) => {
        const results = await this.itemService.updateItemParents(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.collectionIds,
          req.body.removeMissingCollections,
          // The adder decides whether the other people on the collection hear about it
          // (founder decision, 2026-09-19). Silent unless asked.
          !req.body.notifyOthers,
        );

        // NOTE: change log is updated inside function
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    // TODO: remove above?
    this.router.post(
      '/item/save',
      // Excluded from app-level parsers (see app.ts bigBodyPaths): items can
      // carry large inline content (pasted maps, snapshots). Preserves the prior
      // 70mb ceiling so existing clients don't start getting 413s. Parser must
      // precede auth (reads tempAuthToken).
      express.json({limit: '70mb'}),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/save'>, res) => {
        const ctx = RequestContext.instance(req);

        const results = await this.itemService.saveItem(ctx, req.body);

        // NOTE: change log updates happen in function call
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/attachment/add',

      // Excluded from app-level parsers (see app.ts bigBodyPaths): attachments
      // arrive base64-encoded. Modern clients send JSON; urlencoded is legacy.
      express.json({limit: '70mb'}),
      express.urlencoded({
        limit: '70mb',
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/attachment/add'>, res) => {
        const ctx = RequestContext.instance(req);
        const itemId = req.body.itemId;

        const results = await this.itemService.addItemAttachmentViaUpload(
          ctx,
          itemId,
          req.body.attachment,
          req.body.attachmentInfo,
          req.body.encInfo,
          req.body.existingFileId,
        );

        // `nudge: false` when the request that follows nudges: a note's `/item/update` after its
        // text, or `page0.md` after the history page. The row is written either way (SYNC-15).
        await this.changeLogService.logItemChange(ctx, itemId, SyncType.itemUpdate, {nudge: req.body.nudge !== false});
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/attachment/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/attachment/remove'>, res) => {
        const results = await this.itemService.removeItemAttachment(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.attachmentId,
        );
        await this.changeLogService.logItemChange(RequestContext.instance(req), req.body.itemId);
        res.json({
          success: true,
          results: results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/attachment/rename',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/attachment/rename'>, res) => {
        const results = await this.itemService.renameItemAttachment(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.attachmentId,
          req.body.filename,
        );
        res.json({
          success: true,
          results: results,
        });
      }),
    );

    this.router.post(
      '/item/feedback/value/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/feedback/value/update'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.itemService.updateItemFeedbackValue(
          ctx,
          req.body.itemId,
          req.body.attr,
          req.body.value,
        );
        // Feedback is per person: an item is read with the reader's own feedback row only
        // (item.list.service.ts joins item_feedback on the target user), so nobody else's copy
        // changed. Journalled for everyone who could see the item, each of them pulled an item
        // identical to the one they had. The person's own row still reaches their other devices,
        // and a guardian's copy of a child's library, which syncs from the child's rows. Other
        // people's hearts are read fresh from /item/reactions/list when a page opens. SYNC-14.
        await this.changeLogService.logItemChangeForUserIds([ctx.currentUserId], [req.body.itemId]);

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/addToCollections',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/addToCollections'>, res) => {
        const ctx = RequestContext.instance(req);
        const {itemId, collectionIds = [], removeCollectionIds = []} = req.body;
        const results = await this.itemRelationService.updateItemToCollectionMembership(
          ctx,
          itemId,
          collectionIds,
          removeCollectionIds,
        );
        // Everyone on a collection the item joined or left, as updateItemParents records for
        // /item/save, plus the item's own people. Without a row an item filed into someone
        // else's collection never reached them: their sync is driven by these rows (HAT-106).
        const collectionUserIds = await this.permissionService._listUserIdsOfAllUserWithDirectPermissionsToItems(ctx, [
          ...collectionIds,
          ...removeCollectionIds,
        ]);
        const itemUserIds = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, itemId, true);
        await this.changeLogService.logItemChangeForUserIds(
          Array.from(new Set([...collectionUserIds, ...itemUserIds])),
          [itemId],
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/parents/bychildid',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/parents/bychildid'>, res) => {
        const results = await this.itemService.getParentItemsForUser(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
          req.body.includePath,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    // TODO: merge with /item/listByIds?
    this.router.post(
      '/collection/listByIds',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/listByIds'>, res) => {
        const results = await this.itemService.listCollectionsById(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.ids,
          req.body.includePath,
          req.body.includeUserPermissions,
          req.body.allowListAll,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/listByIds',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/listByIds'>, res) => {
        let itemIds = req.body.ids;
        let items = [];
        if (!itemIds || itemIds.length == 0) {
          // 'listByIds' with no ids returns nothing. It must NOT fall back to the
          // entire library: that serializes an unbounded response and is the OOM
          // shape that crashed prod via /sync/update. Full-library fetch is what
          // sync is for. No client sends empty ids (all callers guard on length).
          items = [];
        } else {
          items = await this.itemlistService.listItemsWithInfoByUserForItemIds(
            RequestContext.instance(req),
            getTargetUserId(req),
            new Set(itemIds),
          );
        }
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/collection/listByUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/listByUser'>, res) => {
        const items = await this.itemService.listUserCollections(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.permissionsIncluded,
          req.body.sharedOnly,
          req.body.includePath,
          req.body.includeUserPermissions,
          req.body.includeParents,
        );
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      }),
    );

    // ============================================================================
    // UNIFIED ITEM QUERY ENDPOINT
    // New unified query interface - consolidates multiple specialized endpoints
    // ============================================================================
    this.router.post(
      '/item/query',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/query'>, res) => {
        const queryRequest = req.body;
        const response = await this.itemQueryService.query(RequestContext.instance(req), queryRequest);
        res.json({
          success: true,
          results: response,
        });
      }),
    );

    // RESTORED: /library/uncategorized route
    this.router.post(
      '/library/uncategorized',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/library/uncategorized'>, res) => {
        const results = await this.itemlistService.getUncategorizedList(
          RequestContext.instance(req),
          getTargetUserId(req),
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // RESTORED: /library/archived route
    this.router.post(
      '/library/archived',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/library/archived'>, res) => {
        const results = await this.itemlistService.listArchived(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Archive search (HAT-884): the ids of every archived item, then their rows by id, so a
    // device keeps an archive index and fetches only what it does not have.
    this.router.post(
      '/library/archivedIds',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/library/archivedIds'>, res) => {
        const itemIds = await this.itemlistService.listArchivedIds(RequestContext.instance(req), getTargetUserId(req));
        res.json({success: true, results: {itemIds}});
      }),
    );

    this.router.post(
      '/library/archivedByIds',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/library/archivedByIds'>, res) => {
        const results = await this.itemlistService.listArchivedByIds(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemIds,
        );
        res.json({success: true, results});
      }),
    );

    // RESTORED: /item/listWithFeedback route
    this.router.post(
      '/item/listWithFeedback',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/listWithFeedback'>, res) => {
        const results = await this.itemlistService.listWithFeedback(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.feedbackType,
          req.body.limit,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // RESTORED: /item/listSharedWithUser route
    this.router.post(
      '/item/listSharedWithUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/listSharedWithUser'>, res) => {
        const results = await this.itemlistService.listSharedWithUser(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.sharedByUserId,
          {sinceMs: req.body.sinceMs, limit: req.body.limit, fromFriends: req.body.fromFriends === true},
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Not in library (HAT-984): what this person can open but has not got in their library.
    this.router.post(
      '/item/notInLibrary/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/notInLibrary/list'>, res) => {
        const result = await this.itemlistService.listNotInLibrary(RequestContext.instance(req), getTargetUserId(req), {
          limit: req.body.limit,
          countOnly: req.body.countOnly === true,
        });
        res.json({success: true, results: result});
      }),
    );

    this.router.post(
      '/item/notInLibrary/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/notInLibrary/remove'>, res) => {
        const result = await this.itemService.removeFromNotInLibrary(RequestContext.instance(req), req.body.itemIds);
        res.json({success: true, results: result});
      }),
    );

    this.router.post(
      '/item/listRecentAccessibleByUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/listRecentAccessibleByUser'>, res) => {
        const results = await this.itemlistService.listRecentAccessibleByUser(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.limit,
        );
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    // RESTORED: /item/listSharedByUser route
    this.router.post(
      '/item/listSharedByUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/listSharedByUser'>, res) => {
        const results = await this.itemlistService.listSharedByUser(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // ============================================================================
    // END RESTORED ROUTES
    // ============================================================================

    this.router.post(
      '/collection/items',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/items'>, res) => {
        const results = await this.itemlistService.listItemsWithInfoByCollectionId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.collectionId,
          req.body.typeFilter,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/library/root',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/library/root'>, res) => {
        const results = await this.itemlistService.listLibraryCollectionsRoot(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/collection/removeFromUserLibrary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/removeFromUserLibrary'>, res) => {
        const ctx = RequestContext.instance(req);

        const outcome = await this.itemService.removeUserCollections(
          ctx,
          getTargetUserId(req),
          req.body.collectionIds,
          req.body.fullRemove,
        );

        // Only ids actually written; a refused removal is reported in `results.refused`
        // instead of a bare success. Same reasoning as /collection/addToUserLibrary.
        for (const colId of outcome.added) {
          await this.changeLogService.logItemChange(ctx, colId);
        }

        const result = {
          success: true,
          results: outcome,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/collection/addToUserLibrary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/addToUserLibrary'>, res) => {
        const ctx = RequestContext.instance(req);

        const outcome = await this.itemService.addUserCollectionsToLibrary(
          ctx,
          getTargetUserId(req),
          req.body.collectionIds,
        );

        // Only ids actually written. Same reasoning as /item/addToUserLibrary above.
        for (const colId of outcome.added) {
          await this.changeLogService.logItemChange(ctx, colId);
        }

        const result = {
          success: true,
          results: outcome,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/collection/getItemRelInfo',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/getItemRelInfo'>, res) => {
        const results = await this.itemRelationService.getItemRelationInfo(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemId,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/pathtree',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/pathtree'>, res) => {
        const results = await this.itemService.getPathTree(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/collection/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/create'>, res) => {
        const results = await this.itemService.createCollection(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.details,
          req.body.options,
          req.body.newItemId,
        );
        res.json({
          success: true,
          results: results,
        });
      }),
    );

    this.router.post(
      '/collection/showcase/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/showcase/create'>, res) => {
        const collectionId = await this.itemService.createShowcaseCollection(
          RequestContext.instance(req),
          getTargetUserId(req),
          (req.body as any)?.details,
          (req.body as any)?.options,
        );
        res.json({
          success: true,
          results: collectionId,
        });
      }),
    );

    this.router.post(
      '/collection/showcase/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/showcase/get'>, res) => {
        const collectionId = await this.itemService.getShowcaseCollectionId(
          RequestContext.instance(req),
          getTargetUserId(req),
        );
        res.json({
          success: true,
          results: collectionId,
        });
      }),
    );

    this.router.post(
      '/collection/itemDetails/save',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/itemDetails/save'>, res) => {
        const results = await this.itemRelationService.saveCollectionItemDetails(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemId,
          req.body.details,
          req.body.publishedAvailableAt,
          req.body.encInfo,
        );
        await this.changeLogService.logItemChange(RequestContext.instance(req), req.body.collectionId);

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/collection/order/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/collection/order/update'>, res) => {
        const results = await this.itemRelationService.updateCollectionItemOrder(
          RequestContext.instance(req),
          req.body.collectionId,
          req.body.itemIds,
        );
        await this.changeLogService.logItemChange(RequestContext.instance(req), req.body.collectionId);

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/quickbar/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/quickbar/update'>, res) => {
        await this.itemService.updateQuickBar(RequestContext.instance(req), req.body.itemId);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/updatePermissions',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/updatePermissions'>, res) => {
        const results = await this.permissionService.updateItemPermissions(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.permissionUpdates,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/removeFromUserLibrary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/removeFromUserLibrary'>, res) => {
        const ctx = RequestContext.instance(req);
        const outcome = await this.itemService.removeUserItemsFromLibrary(ctx, getTargetUserId(req), req.body.itemIds);

        // Only ids actually written; a refused removal is reported in `results.refused`
        // instead of a bare success. Same reasoning as /item/addToUserLibrary.
        for (const itemId of outcome.added) {
          await this.changeLogService.logItemChange(ctx, itemId);
        }

        const result = {
          success: true,
          results: outcome,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/addToUserLibrary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/addToUserLibrary'>, res) => {
        const ctx = RequestContext.instance(req);
        const outcome = await this.itemService.addUserItemsToLibrary(ctx, getTargetUserId(req), req.body.itemIds);

        // Only log a change for ids that were actually written. Logging a refused id
        // told every device something changed when nothing had.
        for (const itemId of outcome.added) {
          await this.changeLogService.logItemChange(ctx, itemId);
        }

        // `results` carries which ids were added, which were already in that state, and
        // which were refused. It used to be `{}` with `success: true` regardless, so a
        // caller could not tell a grant from a refusal -- see ERR-2.
        const result = {
          success: true,
          results: outcome,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/setUserPermission',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/setUserPermission'>, res) => {
        const results = await this.permissionService.setUserPermission(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
          req.body.permission,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/shareWithUsers',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/shareWithUsers'>, res) => {
        const results = await this.permissionService.shareItemWithUsers(
          RequestContext.instance(req),
          req.body.itemId,
          req.body.userIds,
          req.body.permission,
          false,
          false,
          req.body.notInLibrary,
          req.body.forceViewerForCrossAccount,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/permissions/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/permissions/list'>, res) => {
        const results = await this.permissionService.listPermissionsToItemWithUserDetails(
          RequestContext.instance(req),
          req.body.itemId,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // TODO: Weird combination of permissions and reactions
    this.router.post(
      '/item/permissionsAndReactions/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/permissionsAndReactions/list'>, res) => {
        const results = await this.permissionService.listPermissionsAndReactions(
          RequestContext.instance(req),
          req.body.itemId,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/item/userPermissionLookup',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/userPermissionLookup'>, res) => {
        const results = await this.permissionService.getUserPermissionLookup(
          RequestContext.instance(req),
          getTargetUserId(req),
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/item/transferOwnership',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/item/transferOwnership'>, res) => {
        const results = await this.permissionService._assignItemOwner(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.itemId,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );
  }
}

export default ItemRoute;
