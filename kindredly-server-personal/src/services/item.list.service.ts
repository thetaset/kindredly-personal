import {HttpException} from '@/exceptions/HttpException';
import {ItemRepo} from '@/db/item.repo';
import {ItemFeedbackRepo} from '@/db/item_feedback.repo';
import {ItemRelationRepo} from '@/db/item_relation.repo';
import knex from '@/db/knex_config';
import {UserPermRepo} from '@/db/user_perm.repo';
import {joinDataSetsByKey} from '@/utils/parse_utils';
import {feedbackFields, feedbackFieldNaming, getFeedbackData, isValidFeedbackField} from '@/utils/feedback_helpers';
import {
  ItemFeedbackView,
  ItemInfoView,
  ItemTypeEnum,
  PermissionType,
  PermissionView,
} from 'tset-sharedlib/shared.types';
import FeedbackService from './feedback.service';
import ItemService from './item.service';
import PermissionService from './permission.service';
import {RequestContext} from '../base/request_context';
import {get} from 'http';
import e from 'express';
import Item from 'tset-sharedlib/schemas/public/Item';
import {all} from 'axios';
import {ListLibraryRootRequest} from 'tset-sharedlib/api';
import {clampPerPage} from '@/utils/pagination_utils';
import UserPerm from 'tset-sharedlib/schemas/public/UserPerm';

class ItemListService {
  // /library/uncategorized page bound, applied AFTER the visible-parent
  // exclusion so it caps genuinely uncategorized items, not candidates.
  static readonly UNCATEGORIZED_MAX_ITEMS = 1000;

  // The library-membership predicate: the user owns the item (and hasn't
  // removed it via notInLibrary) OR holds a user_perm row for it (ditto).
  // Requires the caller's query to carry the user-scoped user_perm leftJoin.
  // This is the SINGLE spelling of the rule — two deliberate variants remain
  // inline: listLibraryRoot (whereNotNull leg, line ~246) and
  // getUncategorizedList/listArchived (no notInLibrary check on the perm leg,
  // kept bug-for-bug).
  private static libraryMembershipWhere(targetUserId: string) {
    return function (this: any) {
      this.where({'item.userId': targetUserId} as any)
        .andWhere(function (this: any) {
          this.whereNull('user_perm._id')
            .orWhereNull('user_perm.notInLibrary')
            .orWhere('user_perm.notInLibrary', false);
        })
        .orWhere(function (this: any) {
          this.where({'user_perm.userId': targetUserId} as any).andWhere(function (this: any) {
            this.whereNull('user_perm.notInLibrary').orWhere('user_perm.notInLibrary', false);
          });
        });
    };
  }

  private feedbackService = new FeedbackService();
  private itemService = new ItemService();

  private itemRepo = new ItemRepo();
  private itemRelations = new ItemRelationRepo();
  private permissionService = new PermissionService();
  public itemFeedbacks = new ItemFeedbackRepo();
  private permissions = new UserPermRepo();

  private async listLibraryItemsWithInfoForUser(
    targetUserId: string,
    includePermissions: boolean = false,
    restrictToItemIds?: string[],
    // Restricted-mode callers that loop over batches pass the permitted
    // collection ids once instead of re-running the full collection scan
    // per batch.
    permittedCollectionIds?: string[],
  ): Promise<ItemInfoView[]> {
    // restrictToItemIds bounds BOTH phases to the given ids so callers can
    // hydrate a page of items through this exact row shaping without
    // materializing the whole library. Collection membership is then
    // discovered by a separate slim query — the restricted phase-1 rows can't
    // provide it (the restricted set usually contains no collections).

    //1) get items user has explicit permission to access
    let explicitQuery = this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOn(
          'item_feedback.userId',
          '=',
          knex.raw('?', [targetUserId]),
        );
      })
      .where(ItemListService.libraryMembershipWhere(targetUserId))
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      });
    if (restrictToItemIds) {
      explicitQuery = explicitQuery.whereIn('item._id', restrictToItemIds);
    }
    let explicitPermission = await explicitQuery.select(
      'item.*',
      'user_perm.createdAt as sharedAt',
      'user_perm.permission as permission',
      'user_perm.userId as permissionUserId',
      'user_perm.sharedByUserId as sharedByUserId',
      ...feedbackFieldNaming,
    );

    let collectionIds = restrictToItemIds
      ? (permittedCollectionIds ?? (await this.listPermittedCollectionIdsForUser(targetUserId)))
      : explicitPermission.filter((v) => v.type === 'col').map((v) => v._id);

    //2) get all items in those collections
    let childQuery = this.itemRelations
      .query()
      .from('item_relation')
      .leftJoin('item', 'item._id', '=', 'item_relation.itemId')

      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item_relation.itemId').andOn(
          'item_feedback.userId',
          '=',
          knex.raw('?', [targetUserId]),
        );
      })
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      })
      .whereIn('item_relation.collectionId', collectionIds);
    if (restrictToItemIds) {
      childQuery = childQuery.whereIn('item_relation.itemId', restrictToItemIds);
    }
    let childItems = await childQuery.select(
      'item.*',
      'item_relation._id as relationId',
      'item_relation.collectionId as parentCollectionId',
      'item_relation.order as relationOrder',
      'item_relation.createdAt as relationCreatedAt',
      ...feedbackFieldNaming,
    );

    let allRecordsWithDups = [...explicitPermission, ...childItems];

    // group and collect full relation objects
    const itemLookup: Record<string, any> = {};
    for (const item of allRecordsWithDups) {
      const currentItem = itemLookup[item._id];
      if (!currentItem) {
        item['collectionRelations'] = [];
        if (item.parentCollectionId) {
          item['collectionRelations'].push({
            _id: item.relationId,
            collectionId: item.parentCollectionId,
            order: item.relationOrder,
            createdAt: item.relationCreatedAt,
          });
        }
        itemLookup[item._id] = item;
      } else {
        if (item.parentCollectionId) {
          currentItem['collectionRelations'].push({
            _id: item.relationId,
            collectionId: item.parentCollectionId,
            order: item.relationOrder,
            createdAt: item.relationCreatedAt,
          });
        }
      }
    }
    let allRecords = Object.values(itemLookup);

    // Set owner permission for owned items that don't have explicit permission set
    for (const item of allRecords) {
      if (item.userId === targetUserId && !item.permission) {
        item.permission = 'owner';
        item.permissionUserId = targetUserId;
      }
    }

    const resultItems = allRecords
      .map((v: any) => {
        const collectionRelations = v.collectionRelations || [];
        return {
          itemId: v._id,
          details: v,
          feedback: getFeedbackData(v),
          collectionRelations,
          collectionIds: collectionRelations.map((r: any) => r.collectionId),
        };
      })
      .filter((v) => v.feedback?.isHidden != true);

    if (includePermissions) {
      await this.attachPermissionsToItems(resultItems);
    }

    return resultItems;
  }

  // Helper: Fetch and attach permissions to items, including owner
  private async attachPermissionsToItems(resultItems: ItemInfoView[]): Promise<void> {
    if (resultItems.length === 0) return;

    const itemIds = resultItems.map((v) => v.itemId);
    const allPerms = await this.permissions
      .query()
      .whereIn('itemId', itemIds)
      .select('itemId', 'userId', 'permission', 'sharedByUserId', 'createdAt');

    const permissionsByItem: Record<string, PermissionView[]> = {};
    for (const perm of allPerms) {
      if (!permissionsByItem[perm.itemId]) permissionsByItem[perm.itemId] = [];
      permissionsByItem[perm.itemId].push({
        userId: perm.userId,
        permission: perm.permission,
        sharedByUserId: perm.sharedByUserId,
        createdAt: perm.createdAt,
      });
    }

    for (const item of resultItems) {
      // Always include owner from item.details.userId
      item.permissions = [{userId: item.details?.userId, permission: PermissionType.owner}];
      if (permissionsByItem[item.itemId]) {
        item.permissions = [...permissionsByItem[item.itemId], ...item.permissions];
      }
    }
  }

  // ROUTE-METHOD
  // not optimized
  async listLibraryCollectionsRoot(
    ctx: RequestContext,
    targetUserId: string,
    reqData: ListLibraryRootRequest,
  ): Promise<ItemInfoView[]> {
    const {includeUserPermissions = false, limit = null} = reqData;

    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('User not found');
    }

    const sameAccount = targetUser.accountId === ctx.accountId;
    if (sameAccount) {
      await ctx.verifyInAccount(targetUserId);
    } else {
      // Allow browsing discoverable collections for confirmed friends.
      await ctx.verifyInNetwork([targetUserId]);
    }

    const isSelfOrUserAdmin = sameAccount ? await ctx.isSelfOrAdminOfUser(targetUserId) : false;

    let allRecordsQuery = this.permissions
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOnVal('user_perm.userId', '=', targetUserId);
      })
      .where(function () {
        this.where({'item.userId': targetUserId} as any)
          .andWhere(function () {
            this.whereNull('user_perm._id')
              .orWhereNull('user_perm.notInLibrary')
              .orWhere('user_perm.notInLibrary', false);
          })
          .orWhere(function () {
            this.whereNotNull('user_perm._id').andWhere(function () {
              // Treat null as legacy default (in library)
              this.whereNull('user_perm.notInLibrary').orWhere('user_perm.notInLibrary', false);
            });
          });
      })
      .leftJoin('item_relation', 'item_relation.itemId', '=', 'item._id')
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOnVal('item_feedback.userId', '=', targetUserId);
      })
      .where('item.type', 'col')

      .select(
        'item.*',
        'item_relation.collectionId as parentId',
        'user_perm.permission as permission',
        'user_perm.userId as permissionUserId',
        'user_perm.createdAt as permissionCreatedAt',
        ...feedbackFieldNaming,
      )
      .orderBy('item.name', 'asc');

    if (!isSelfOrUserAdmin) {
      // When browsing another user's library:
      // - within same account: show family-discoverable + network-discoverable
      // - cross-account (friend): show only network-discoverable
      if (sameAccount) {
        allRecordsQuery = allRecordsQuery.whereIn('item.visibility', ['shared', 'network']);
      } else {
        allRecordsQuery = allRecordsQuery.where('item.visibility', 'network');
      }
    }

    allRecordsQuery = allRecordsQuery.limit(limit || 800);

    let allRecords = await allRecordsQuery;

    // set owner permission
    allRecords.forEach((v) => {
      if (v.userId == targetUserId && !v.permission) {
        v.permission = PermissionType.owner;
        v.permissionUserId = targetUserId;
      }
      if (v.userId == ctx.currentUserId) {
        v.permission = PermissionType.owner;
        v.permissionUserId = ctx.currentUserId;
      }
    });

    const permissionLookup = Object.fromEntries(
      allRecords.map((v) => {
        return [v._id, v.permission];
      }),
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
      col['parents'] = [];
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

    // Include all user permissions if requested
    if (includeUserPermissions) {
      await this.attachPermissionsToItems(resultItems);
    }

    return resultItems;
  }

  // Ids-only variant of listLibraryItemsWithInfoForUser for chunked full sync.
  // Mirrors the same two-phase membership rules (explicit permission + items in
  // permitted collections) and the archived/hidden filters, but selects only
  // ids so a huge library never materializes full rows in memory.
  async listLibraryItemIdsForUser(ctx: RequestContext, targetUserId: string): Promise<string[]> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    //1) items user has explicit permission to access
    const explicitRows = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOn(
          'item_feedback.userId',
          '=',
          knex.raw('?', [targetUserId]),
        );
      })
      .where(ItemListService.libraryMembershipWhere(targetUserId))
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      })
      .select('item._id', 'item.type', 'item_feedback.isHidden as isHidden');

    const collectionIds = explicitRows.filter((v) => v.type === 'col').map((v) => v._id);

    //2) items in those collections
    const childRows = collectionIds.length
      ? await this.itemRelations
          .query()
          .from('item_relation')
          .leftJoin('item', 'item._id', '=', 'item_relation.itemId')
          .leftJoin('item_feedback', function () {
            this.on('item_feedback.itemId', '=', 'item_relation.itemId').andOn(
              'item_feedback.userId',
              '=',
              knex.raw('?', [targetUserId]),
            );
          })
          .where(function () {
            this.where('item.archived', '<>', true).orWhereNull('item.archived');
          })
          .whereIn('item_relation.collectionId', collectionIds)
          .select('item._id', 'item_feedback.isHidden as isHidden')
      : [];

    const ids: string[] = [];
    const seen = new Set<string>();
    for (const row of [...explicitRows, ...childRows]) {
      if (!row._id || seen.has(row._id) || row.isHidden == true) continue;
      seen.add(row._id);
      ids.push(row._id);
    }
    return ids;
  }

  // Ids of collections the user's library membership rules admit. Deliberately
  // does NOT drop hidden collections: hidden collections still contribute
  // their children to the library (parity with listLibraryItemsWithInfoForUser,
  // which derives collectionIds before its hidden filter runs).
  private async listPermittedCollectionIdsForUser(targetUserId: string): Promise<string[]> {
    const rows = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .where(ItemListService.libraryMembershipWhere(targetUserId))
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      })
      .where('item.type', 'col')
      .select('item._id');
    return rows.map((v: any) => v._id);
  }

  // Slim recency pass for listRecentAccessibleByUser: the library membership
  // of listLibraryItemIdsForUser plus only the timestamp columns recency needs
  // (~100B/row, no encrypted item.data), so a huge library never materializes
  // full rows just to pick the newest 80. Excludes hidden items and
  // collections, matching what the old full-row path filtered.
  private async listLibraryItemRecencyRowsForUser(targetUserId: string): Promise<
    Array<{
      _id: string;
      createdAt: Date | string | null;
      sharedAt: Date | string | null;
      relationCreatedAtMs: number;
    }>
  > {
    const membershipWhere = ItemListService.libraryMembershipWhere(targetUserId);

    //1) explicit-permission rows (slim)
    const explicitRows = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOn(
          'item_feedback.userId',
          '=',
          knex.raw('?', [targetUserId]),
        );
      })
      .where(membershipWhere)
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      })
      .select(
        'item._id',
        'item.type',
        'item.createdAt as createdAt',
        'user_perm.createdAt as sharedAt',
        'item_feedback.isHidden as isHidden',
      );

    const collectionIds = explicitRows.filter((v: any) => v.type === 'col').map((v: any) => v._id);

    //2) rows for items inside those collections (slim, carries relation timestamps)
    const childRows = collectionIds.length
      ? await this.itemRelations
          .query()
          .from('item_relation')
          .leftJoin('item', 'item._id', '=', 'item_relation.itemId')
          .leftJoin('item_feedback', function () {
            this.on('item_feedback.itemId', '=', 'item_relation.itemId').andOn(
              'item_feedback.userId',
              '=',
              knex.raw('?', [targetUserId]),
            );
          })
          .where(function () {
            this.where('item.archived', '<>', true).orWhereNull('item.archived');
          })
          .whereIn('item_relation.collectionId', collectionIds)
          .select(
            'item._id',
            'item.type',
            'item.createdAt as createdAt',
            'item_relation.createdAt as relationCreatedAt',
            'item_feedback.isHidden as isHidden',
          )
      : [];

    const toMs = (value: any) => {
      const ms = new Date(value || 0).getTime();
      return ms > 0 ? ms : 0;
    };

    // First-seen row wins for base fields (explicit rows come first, matching
    // the full path's merge order); relation recency accumulates across all of
    // an item's relation rows.
    const lookup = new Map<string, any>();
    for (const row of [...explicitRows, ...childRows] as any[]) {
      if (!row._id) continue;
      const existing = lookup.get(row._id);
      if (!existing) {
        lookup.set(row._id, {
          _id: row._id,
          type: row.type,
          isHidden: row.isHidden,
          createdAt: row.createdAt,
          sharedAt: row.sharedAt ?? null,
          relationCreatedAtMs: toMs(row.relationCreatedAt),
        });
      } else {
        existing.relationCreatedAtMs = Math.max(existing.relationCreatedAtMs, toMs(row.relationCreatedAt));
      }
    }

    return [...lookup.values()].filter((v) => v.isHidden != true && v.type !== ItemTypeEnum.collection);
  }

  // NOTE: Used by /item/listByUser and other active routes
  // ROUTE-METHOD
  async listAllItemsWithInfoByUser(
    ctx: RequestContext,
    targetUserId: string,
    includePermissions: boolean = false,
  ): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    return await this.listLibraryItemsWithInfoForUser(targetUserId, includePermissions);
  }

  // ROUTE-METHOD
  async listItemsWithInfoByUserForItemIds(
    ctx: RequestContext,
    targetUserId: string,
    requestedItemIdsSet: Set<string>,
    includePermissions: boolean = false,
  ): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    let requestedItemIds = Array.from(requestedItemIdsSet);

    // Get all items requested
    let items = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOnIn('item_feedback.userId', [targetUserId]);
      })
      .whereIn('item._id', requestedItemIds)
      .where(function () {
        this.where('item.archived', '<>', true).orWhereNull('item.archived');
      })
      .select('item.*', ...feedbackFieldNaming);

    let nonCollections = items.filter((v) => v.type != ItemTypeEnum.collection);
    let nonCollectionIds = nonCollections.map((v) => v._id);

    // Get parents of items (collections must get explict permission)
    let itemParentsRelations = await this.itemRelations
      .query()
      .from('item_relation')
      .whereIn('itemId', nonCollectionIds)
      .select('_id', 'itemId', 'collectionId', 'order', 'createdAt');

    // Create relations lookup (collectionRelations) - collectionIds derived from this
    let relationsLookup: Record<
      string,
      Array<{_id: string; collectionId: string; order: number | null; createdAt: string | null}>
    > = {};
    for (const p of itemParentsRelations) {
      if (!p.collectionId) continue;

      if (!relationsLookup[p.itemId]) {
        relationsLookup[p.itemId] = [];
      }
      relationsLookup[p.itemId].push({
        _id: p._id,
        collectionId: p.collectionId,
        order: p.order,
        createdAt: p.createdAt,
      });
    }
    let parentIds = itemParentsRelations.map((v) => v.collectionId);

    // Get permissions for items and parents
    let directItemAndParentPerms = await this.permissions
      .query()
      .from('user_perm')
      .where({'user_perm.userId': targetUserId} as any)
      .andWhere(function () {
        this.whereNull('user_perm.notInLibrary').orWhere('user_perm.notInLibrary', false);
      })
      .whereIn('itemId', [...requestedItemIds, ...parentIds])
      .select('itemId', 'permission as permission');

    let directPermLookup = Object.fromEntries(directItemAndParentPerms.map((v) => [v.itemId, v.permission]));

    // Parent collections OWNED by the target grant access to their children even
    // without a user_perm row (owned items carry no explicit permission). Legacy
    // full sync (listLibraryItemsWithInfoForUser phase 2) includes children of
    // owned collections unconditionally; without this, chunked full sync would
    // silently drop foreign-owned items sitting inside a collection you own.
    const ownedParentColIds = new Set(
      (
        await this.itemRepo
          .query()
          .from('item')
          .whereIn('_id', parentIds)
          .where({userId: targetUserId, type: ItemTypeEnum.collection} as any)
          .select('_id')
      ).map((v) => v._id),
    );

    // Members reachable only via an owned parent collection (no derivable
    // permission of their own). Kept in the library set to match legacy sync.
    const memberViaOwnedParent = new Set<string>();

    // add direct permission to items
    for (const item of items) {
      if (targetUserId == item?.userId) {
        item.permission = 'owner';
        item.permissionUserId = targetUserId;
      } else if (item._id in directPermLookup) {
        let userPermissionValue = directPermLookup[item._id];
        if (item.permission != 'editor') {
          item.permission = userPermissionValue;
          item.permissionUserId = targetUserId;
        }
      } else {
        let itemParentIds = (relationsLookup[item._id] || []).map((r) => r.collectionId);
        let perms = itemParentIds.filter((p) => p in directPermLookup).map((p) => directPermLookup[p]);

        for (const perm of perms) {
          if (item.permission != 'editor') {
            item.permission = perm;
            item.permissionUserId = targetUserId;
            item.permissionIndirect = true;
            break;
          }
        }

        if (!item.permission && itemParentIds.some((p) => ownedParentColIds.has(p))) {
          memberViaOwnedParent.add(item._id);
        }
      }
    }
    // Keep items with a derived permission OR membership via an owned collection.
    let allRecords = items.filter((v) => !!v.permission || memberViaOwnedParent.has(v._id));

    // Double check for duplicates and remove duplicates
    // create set for fast lookup
    const set = new Set();
    allRecords = allRecords.filter((v: any) => {
      if (set.has(v._id)) return false;
      set.add(v._id);
      return true;
    });

    const resultItems: ItemInfoView[] = allRecords
      .map((v: any) => {
        const collectionRelations = relationsLookup[v._id] || [];

        return {
          itemId: v._id,
          details: v,
          collectionRelations,
          // Backwards compatibility - derive collectionIds from collectionRelations
          collectionIds: collectionRelations.map((r) => r.collectionId),
          feedback: getFeedbackData(v),
        };
      })
      .filter((v) => v.feedback?.isHidden != true);

    // Include all user permissions if requested
    if (includePermissions) {
      await this.attachPermissionsToItems(resultItems);
    }

    return resultItems;
  }

  // ROUTE-METHOD
  async listItemsWithIdAndInAccount(ctx: RequestContext, ids: string[]) {
    return (await this.itemRepo.findWhereIdInAndInAccount(ids, ctx.accountId)) as Item[];
  }

  // NOTE: Used by /collections/items and other active routes
  // ROUTE-METHOD
  async listItemsWithInfoByCollectionId(
    ctx: RequestContext,
    targetUserId: string,
    collectionId: string,
    typeFilter = null,
    hideArchived = true,
  ): Promise<ItemInfoView[]> {
    if (!collectionId) return [];

    // This is a read path. Same-account admins may inspect another admin's collection context
    // when the subsequent collection permission checks allow access.
    await ctx.verifySelfOrAdmin(targetUserId);
    const collection = await ctx.getItemById(collectionId);

    if (!collection || collection.deleted) {
      // A pointer to a collection that no longer exists (or was soft-deleted) is a miss, not a
      // server fault. 500 here made ordinary dangling pointers — e.g. a stale
      // user.quickBarCollectionId — indistinguishable from real faults in logs and alerting.
      // The message is load-bearing: useQuickbar.ts matches /invalid collection/i to hide the
      // quickbar instead of erroring, so keep the text exactly as-is.
      throw new HttpException(404, 'Invalid collection');
    }

    // Perm to collection
    // - OK if is shared and in account
    // - OK if direct permission

    let hasPermission: boolean = false;
    let parentCollectionPermission: PermissionType | null = null;

    //TODO: this needs to be replaced because we can't depend on accountId
    let permMessage = "You don't have permission to list this collections items.";
    if (
      (collection.visibility === 'shared' || collection.visibility === 'network') &&
      collection.accountId == ctx.accountId
    ) {
      hasPermission = true;
      // Shared collections in same account give viewer access by default
      parentCollectionPermission = PermissionType.viewer;
    }

    // Network-discoverable collections are accessible to confirmed friends (and family).
    if (!hasPermission && collection.visibility === 'network') {
      const ownerUserId = collection.userId;
      if (ownerUserId && (await ctx.isInNetwork(ownerUserId))) {
        hasPermission = true;
        parentCollectionPermission = PermissionType.viewer;
      }
    }

    // Check if user owns the collection
    if (collection.userId == targetUserId) {
      hasPermission = true;
      parentCollectionPermission = PermissionType.owner;
    }

    // Check direct permission on collection
    if (!hasPermission || parentCollectionPermission !== PermissionType.owner) {
      const skipAccessCheck = collection.accountId != ctx.accountId;
      const permLookup = await this.permissionService._getPermissionLookupForItem(
        ctx,
        collectionId,
        skipAccessCheck,
        true,
      );

      if (targetUserId in permLookup) {
        hasPermission = true;
        const userPerm = permLookup[targetUserId];
        if (userPerm?.permission) {
          parentCollectionPermission = userPerm.permission as PermissionType;
        }
      }
    }

    if (!hasPermission) {
      throw new Error(permMessage);
    }

    let query = this.itemRelations
      .query()
      .from('item_relation')
      .leftJoin('item', 'item._id', '=', 'item_relation.itemId')
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item_relation.itemId').andOnIn('item_feedback.userId', [targetUserId]);
      })
      .where({'item_relation.collectionId': collectionId} as any)
      .select(
        'item.*',
        'item_relation._id as collectionRelationId',
        'item_relation.collectionId as parentId',
        'item_relation.itemType as itemType',
        'item_relation.publishedUpdatedAt as publishedUpdatedAt',
        'item_relation.publishedAvailableAt as publishedAvailableAt',
        'item_relation.details as itemRelationDetails',
        'item_relation.encrypted as relationEncrypted',
        'item_relation.order as order',
        'item_relation.createdAt as relationCreatedAt',
        ...feedbackFieldNaming,
      )
      .orderBy('order', 'desc');

    if (typeFilter) {
      query = query.where('item_relation.itemType', typeFilter);
    }

    let resultItems = await query;

    let itemIds = resultItems.map((v) => v._id);

    const directPermLookup = await this.permissionService._getDirectPermissionLookupForItemIdsExcludingOwner(
      targetUserId,
      itemIds,
    );

    const isAdmin = await ctx.isAdmin();

    resultItems = resultItems.filter((v) => {
      return (
        v.type != ItemTypeEnum.collection ||
        v._id in directPermLookup ||
        v.visibility === 'shared' ||
        v.visibility === 'network' ||
        isAdmin
      );
    });
    let missingItemsRelationIds = resultItems.filter((v) => v._id == null).map((v) => v.collectionRelationId);
    // Clean up
    this.itemRelations.deleteWhereIn('_id', missingItemsRelationIds).catch((e) => {
      console.error('Error cleaning up missing items', e);
    });

    return resultItems
      .filter((v) => (!hideArchived || v.archived != true) && v?.isHidden != true && !!v._id)
      .map((v) => {
        // Set permission info for the current user
        let permission = directPermLookup[v._id];
        let permissionUserId = permission ? targetUserId : undefined;

        // If user owns the item, they have owner permission
        if (v.userId == targetUserId) {
          permission = PermissionType.owner;
          permissionUserId = targetUserId;
        }
        // If no direct permission but item is in a collection they have access to, inherit parent's permission
        else if (!permission && parentCollectionPermission) {
          permission = parentCollectionPermission;
          permissionUserId = targetUserId;
        }

        // Add permission info to details for client consumption
        v.permission = permission;
        v.permissionUserId = permissionUserId;

        return {
          itemId: v._id,
          details: v,
          collectionRelation: {
            _id: v.collectionRelationId,
            collectionId: v.parentId,
            itemType: v.itemType,
            publishedUpdatedAt: v.publishedUpdatedAt,
            publishedAvailableAt: v.publishedAvailableAt,
            createdAt: v.relationCreatedAt,
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

  // RESTORED: Was deleted during item.query.service.ts refactoring (Nov 2025)
  // ROUTE-METHOD
  async listArchived(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let explicitPermissions = await this.permissions
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .where(function () {
        this.where({'item.userId': targetUserId} as any)
          .andWhere(function () {
            this.whereNull('user_perm._id')
              .orWhereNull('user_perm.notInLibrary')
              .orWhere('user_perm.notInLibrary', false);
          })
          .orWhere({
            'user_perm.userId': targetUserId,
          } as any);
      })
      .where('item.archived', true)
      .select('item.*');

    // 1) first get all collections that can have children
    let collections = await this.permissions
      .query()
      .from('user_perm')
      .where({'user_perm.userId': targetUserId} as any)
      .leftJoin('item', 'item._id', '=', 'user_perm.itemId')
      .where('item.type', 'col')
      .select('item.*');

    // 2) get all items in those collections
    let items = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('item_relation', 'item_relation.itemId', '=', 'item._id')
      .leftJoin('user_perm', function () {
        this.on('user_perm.itemId', '=', 'item._id').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .where('item.archived', true)
      .where({'item.userId': targetUserId} as any)
      .andWhere(function () {
        this.whereNull('user_perm._id').orWhereNull('user_perm.notInLibrary').orWhere('user_perm.notInLibrary', false);
      })
      .whereIn(
        'item_relation.collectionId',
        collections.map((v) => v._id),
      )
      .select('item.*');

    let allRecords = [...explicitPermissions, ...items];

    const set = new Set();
    allRecords = allRecords.filter((v: any) => {
      if (set.has(v._id)) return false;
      set.add(v._id);
      return true;
    });

    let itemIds = allRecords.map((v: any) => v._id);

    const itemFeedback = await this.feedbackService._getItemFeedbackByIds(targetUserId, itemIds);
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

  // RESTORED: Was deleted during item.query.service.ts refactoring (Nov 2025)
  // ROUTE-METHOD
  async listWithFeedback(
    ctx: RequestContext,
    targetUserId: string,
    feedbackType: string,
    limit: number,
  ): Promise<ItemInfoView[]> {
    await ctx.verifyInAccount(targetUserId);

    // check feedback type
    if (!isValidFeedbackField(feedbackType)) {
      throw new Error('Invalid feedback type');
    }
    // Historical default of 1000 kept, but now also a ceiling: unclamped, one
    // request could materialize every feedback-bearing item with full rows.
    limit = clampPerPage(limit, 1000, 1000);

    let allRecords = await this.feedbackService.itemFeedbackRepo
      .query()
      .from('item_feedback')
      .where({'item_feedback.userId': targetUserId} as any)
      .whereNotNull(`item_feedback.${feedbackType}`)
      .leftJoin('item', 'item_feedback.itemId', '=', 'item._id')
      .select('item.*', ...feedbackFieldNaming)
      .orderBy(`item_feedback.${feedbackType}`, 'desc')
      .limit(limit);

    const resultItems = allRecords;

    return resultItems
      .filter((v) => v._id != null)
      .filter((v) => !v.archived && (feedbackType == 'isHidden' ? v.isHidden == true : v.isHidden != true))
      .map((v) => {
        return {
          itemId: v._id,
          details: v,
          feedback: getFeedbackData(v),
        };
      });
  }

  // RESTORED: Was deleted during item.query.service.ts refactoring (Nov 2025)
  // ROUTE-METHOD
  async getUncategorizedList(ctx: RequestContext, targetUserId: string): Promise<ItemInfoView[]> {
    await ctx.verifySelfOrAdmin(targetUserId);

    // Shared membership rules for this route (note: the orWhere leg here has
    // no notInLibrary check — historical behavior, kept bug-for-bug).
    const membershipWhere = function (this: any) {
      this.where({'item.userId': targetUserId} as any)
        .andWhere(function (this: any) {
          this.whereNull('user_perm._id')
            .orWhereNull('user_perm.notInLibrary')
            .orWhere('user_perm.notInLibrary', false);
        })
        .orWhere({
          'user_perm.userId': targetUserId,
        } as any);
    };

    // The old single query joined item_relation directly, fanning out one row
    // per collection membership over the whole library, then deduped and
    // double-copied the array in JS. Split instead into two bounded queries.

    // A) The user's visible collection ids. Deliberately UNLIMITED: if a
    //    parent collection were dropped by a cap, its children would wrongly
    //    surface as uncategorized. Slim (ids only), so scale is fine.
    const collectionRows = await this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('item._id', '=', 'user_perm.itemId').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .where(membershipWhere)
      .where('item.type', 'col')
      .select('item._id');
    const userParentIds = new Set(collectionRows.map((v: any) => v._id));

    // B) Uncategorized non-collection items, newest first, bounded. The
    //    visible-parent exclusion runs IN SQL, before the cap — capping raw
    //    candidates instead would let a well-organized library's newest 1000
    //    (all categorized) crowd out every genuinely uncategorized item.
    //    NULL-type parity: the old JS filter (type != 'col') kept null-type
    //    rows, and SQL whereNot alone would drop them.
    let candidatesQuery = this.itemRepo
      .query()
      .from('item')
      .leftJoin('user_perm', function () {
        this.on('item._id', '=', 'user_perm.itemId').andOn('user_perm.userId', '=', knex.raw('?', [targetUserId]));
      })
      .where(membershipWhere)
      .where(function () {
        this.whereNot('item.type', 'col').orWhereNull('item.type');
      });
    const visibleParentIds = Array.from(userParentIds);
    if (visibleParentIds.length) {
      candidatesQuery = candidatesQuery.whereNotExists(function () {
        this.select(knex.raw('1'))
          .from('item_relation')
          .whereRaw('item_relation."itemId" = item._id')
          .whereIn('item_relation.collectionId', visibleParentIds);
      });
    }
    const resultItems = await candidatesQuery
      .select('item.*', 'user_perm.permission as permission')
      .orderBy('item.createdAt', 'desc')
      .limit(ItemListService.UNCATEGORIZED_MAX_ITEMS);

    const resultItemIds = resultItems.map((v: any) => v._id);
    const itemFeedback = await this.feedbackService._getItemFeedbackByIds(targetUserId, resultItemIds);
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

  // RESTORED: Was deleted during item.query.service.ts refactoring (Nov 2025)
  // ROUTE-METHOD
  async listSharedWithUser(ctx: RequestContext, targetUserId: string, sharedByUserId?: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let query = this.permissions
      .query()
      .from('user_perm')
      .where({'user_perm.userId': targetUserId} as any)
      .whereNotNull('user_perm.sharedByUserId')
      .whereNot('user_perm.sharedByUserId', targetUserId)
      .leftJoin('item', 'item._id', '=', 'user_perm.itemId')
      .leftJoin('user', 'user._id', '=', 'user_perm.sharedByUserId')
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOn('item_feedback.userId', '=', 'user_perm.userId');
      })
      .select(
        'item.*',
        'user_perm.createdAt as sharedAt',
        'user_perm.permission as permission',
        'user_perm.userId as permissionUserId',
        'user_perm.sharedByUserId as sharedByUserId',
        'user_perm.notInLibrary as notInLibrary',
        ...feedbackFieldNaming,
      )
      .orderBy('sharedAt', 'desc');

    if (sharedByUserId) {
      query = query.where('user_perm.sharedByUserId', sharedByUserId);
    }

    let items = await query;

    return items.map((v) => {
      return {
        itemId: v._id,
        details: v,
        feedback: getFeedbackData(v),
      };
    });
  }

  async listRecentAccessibleByUser(ctx: RequestContext, targetUserId: string, limit = 80): Promise<ItemInfoView[]> {
    const targetUser = await ctx.getUserById(targetUserId);
    if (!targetUser || targetUser.deleted) {
      throw new Error('User not found');
    }

    const sameAccount = targetUser.accountId === ctx.accountId;
    if (sameAccount) {
      await ctx.verifyInAccount(targetUserId);
    } else {
      await ctx.verifyInNetwork([targetUserId]);
    }

    const safeLimit = clampPerPage(limit, 80);

    // Slim pass: membership + timestamps only. The old implementation
    // materialized the target user's ENTIRE library (full rows, encrypted
    // blobs included) to return at most 200 items — cross-account, one small
    // request could pull hundreds of MB into heap.
    const slimRows = await this.listLibraryItemRecencyRowsForUser(targetUserId);

    const candidateItemIds = slimRows.map((row) => row._id);
    const viewerShareEntries: any[] = [];
    for (let i = 0; i < candidateItemIds.length; i += 1000) {
      const slice = candidateItemIds.slice(i, i + 1000);
      viewerShareEntries.push(
        ...(await this.permissions
          .query()
          .from('user_perm')
          .select('itemId', 'createdAt', 'permission', 'sharedByUserId')
          .where('userId', ctx.currentUserId)
          .where('sharedByUserId', targetUserId)
          .where(function () {
            this.whereNull('notInLibrary').orWhere('notInLibrary', false);
          })
          .whereIn('itemId', slice)),
      );
    }

    const viewerShareLookup = Object.fromEntries(viewerShareEntries.map((entry: any) => [entry.itemId, entry]));

    const recencyForRow = (row: {_id: string; createdAt: any; sharedAt: any; relationCreatedAtMs: number}) => {
      const recencyCandidates: number[] = [];
      const detailCreatedAt = new Date(row.createdAt || 0).getTime();
      if (detailCreatedAt > 0) recencyCandidates.push(detailCreatedAt);

      const detailSharedAt = new Date(row.sharedAt || 0).getTime();
      if (detailSharedAt > 0) recencyCandidates.push(detailSharedAt);

      if (row.relationCreatedAtMs > 0) recencyCandidates.push(row.relationCreatedAtMs);

      const viewerSharedAt = new Date(viewerShareLookup[row._id]?.createdAt || 0).getTime();
      if (viewerSharedAt > 0) recencyCandidates.push(viewerSharedAt);

      const recencyMs = Math.max(0, ...recencyCandidates);
      const recencyIso = recencyMs > 0 ? new Date(recencyMs).toISOString() : undefined;
      return {recencyMs, recencyIso};
    };

    const orderedRows = slimRows.map((row) => ({row, ...recencyForRow(row)})).sort((a, b) => b.recencyMs - a.recencyMs);

    // Hydrate full rows in recency-ordered batches through the SAME row
    // shaping as before (listLibraryItemsWithInfoForUser, restricted), and run
    // the per-item viewer permission gate — the only cross-account enforcement
    // on this route — until the page fills.
    const results: ItemInfoView[] = [];
    const batchSize = Math.max(safeLimit, 100);
    // Computed once and threaded through every batch — restricted hydration
    // otherwise re-runs the full collection-membership scan per batch.
    const permittedCollectionIds =
      orderedRows.length > 0 ? await this.listPermittedCollectionIdsForUser(targetUserId) : [];
    for (let i = 0; i < orderedRows.length && results.length < safeLimit; i += batchSize) {
      const batch = orderedRows.slice(i, i + batchSize);
      const hydrated = await this.listLibraryItemsWithInfoForUser(
        targetUserId,
        false,
        batch.map((entry) => entry.row._id),
        permittedCollectionIds,
      );
      const hydratedById = new Map(hydrated.map((item) => [item.itemId, item]));

      for (const entry of batch) {
        if (results.length >= safeLimit) break;
        const item = hydratedById.get(entry.row._id);
        if (!item) continue; // deleted between passes

        try {
          await this.itemService.getItemInfoById(ctx, item.itemId, true, false, false);
        } catch (_error) {
          continue;
        }

        results.push({
          ...item,
          details: {
            ...item.details,
            sharedAt: entry.recencyIso || (item.details as any)?.sharedAt,
          } as any,
        });
      }
    }

    return results;
  }

  // RESTORED: Was deleted during item.query.service.ts refactoring (Nov 2025)
  // ROUTE-METHOD
  async listSharedByUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdmin(targetUserId);

    let items = await this.permissions
      .query()
      .from('user_perm')
      .where({'user_perm.sharedByUserId': targetUserId} as any)
      .whereNot('user_perm.userId', targetUserId)
      .leftJoin('item', 'item._id', '=', 'user_perm.itemId')
      .leftJoin('user', 'user._id', '=', 'user_perm.userId')
      .leftJoin('item_feedback', function () {
        this.on('item_feedback.itemId', '=', 'item._id').andOn('item_feedback.userId', '=', 'user_perm.sharedByUserId');
      })
      .select(
        'item.*',
        'user_perm.permission as permission',
        'user_perm.userId as permissionUserId',
        'user_perm.createdAt as sharedAt',
        'user_perm.userId as sharedWithUserId',
        ...feedbackFieldNaming,
      )
      .orderBy('sharedAt', 'desc');

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
