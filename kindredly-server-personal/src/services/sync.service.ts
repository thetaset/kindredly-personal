import {SyncType, UserChangeLogRepo} from '@/db/user_changelog.repo';
import {RequestContext} from '@/base/request_context';
import {DynamicObject} from '@/utils/crypto_util';

import {ItemChangeLogUpdate, ItemTypeEnum} from 'tset-sharedlib/shared.types';
import {
  SYNC_FETCH_MAX_IDS_PER_PAGE,
  SYNC_PARTIAL_MAX_CHANGED_IDS,
  SYNC_SINGLE_RESPONSE_MAX_ITEMS,
} from 'tset-sharedlib/constants';
import {HttpException} from '@/exceptions/HttpException';
import {logger} from '@/utils/logger';
import ItemListService from './item.list.service';
import ItemRelationService from './item.relations';
import ItemService from './item.service';
import UserService from './user.service';
import {config} from '@/config';
import {EXTENDED_LOG_RETENTION_DAYS} from './data_retention.service';

/**
 * What the client has already seen. SYNC-4.
 *
 * `lastRevision` wins when both are present: a client sends both exactly once, on
 * its first sync after upgrading, and the integer is the better of the two.
 */
export type SyncCursor = {
  lastUpdate?: Date | null;
  lastRevision?: number | null;
};

class SyncService {
  // Sourced from tset-sharedlib so the client's page size can't exceed it.
  static readonly MAX_FETCH_IDS_PER_PAGE = SYNC_FETCH_MAX_IDS_PER_PAGE;

  // Above this many changed ids, a partial sync flips to fullReset instead of
  // materializing every changed item in one response.
  static readonly PARTIAL_MAX_CHANGED_IDS = SYNC_PARTIAL_MAX_CHANGED_IDS;

  // readonly is compile-time only; integration tests lower it via `as any`.
  static readonly SINGLE_RESPONSE_MAX_ITEMS = SYNC_SINGLE_RESPONSE_MAX_ITEMS;

  private changeLog = new UserChangeLogRepo();
  private itemService = new ItemService();
  private itemlistService = new ItemListService();
  private itemRelationService = new ItemRelationService();
  private userService = new UserService();

  // ROUTE-METHOD
  async runSync(
    ctx: RequestContext,
    targetUserId: string,
    cursor: SyncCursor,
    opts: {chunked?: boolean; fetchItemIds?: string[]} = {},
  ): Promise<ItemChangeLogUpdate> {
    await ctx.verifySelfOrAdminOverUser(targetUserId);

    // Chunked full sync, page fetch: return details for one page of ids.
    // listItemsWithInfoByUserForItemIds enforces per-item permissions, so
    // arbitrary requested ids can't leak items the user has no access to.
    // Handled before updateLastActiveAt: a single full sync issues many page
    // requests, and last-active was already stamped by the initial ids request,
    // so re-writing the user row on every page is pure write amplification.
    if (Array.isArray(opts.fetchItemIds)) {
      if (opts.fetchItemIds.length === 0 || opts.fetchItemIds.length > SyncService.MAX_FETCH_IDS_PER_PAGE) {
        throw new Error(`fetchItemIds must contain 1-${SyncService.MAX_FETCH_IDS_PER_PAGE} ids`);
      }
      const updatedItems = await this.itemlistService.listItemsWithInfoByUserForItemIds(
        ctx,
        targetUserId,
        new Set(opts.fetchItemIds),
        true, // includePermissions
      );
      return {
        fullReset: false,
        totalUpdates: updatedItems.length,
        updatedItems,
        removedItemIds: [],
      };
    }

    this.userService.updateLastActiveAt(ctx);

    // Captured BEFORE the read, deliberately. A row written while we are reading
    // gets a higher id than this, so it is delivered now AND again on the next
    // sync rather than being silently skipped -- at-least-once, which is what the
    // date cursor gave too. Capturing it after the read would make it exactly-once
    // on paper and lossy in practice.
    const revision = await this.changeLog.maxRevisionForUser(targetUserId);

    let fullResetRequest = false;
    let fullResetReason: string | undefined;
    const updatedItemIdsSet = new Set<string>();
    if (cursor.lastRevision == null && !cursor.lastUpdate) {
      fullResetRequest = true;
      fullResetReason = 'noCursor';
    } else if (await this._cursorPredatesRetention(targetUserId, cursor)) {
      // SYNC-9. Answering a partial here would tell the client about only the changes
      // still in the table and leave it believing it was caught up -- a silently wrong
      // library, which is strictly worse than the cost of a reset.
      fullResetRequest = true;
      fullResetReason = 'cursorPredatesRetention';
    } else {
      // An upgraded client sends `lastRevision`; one that has not upgraded keeps
      // sending `lastUpdate` and keeps the date query. Nobody is forced to reset.
      const lst =
        cursor.lastRevision != null
          ? await this.changeLog.changeLogSinceRevision(targetUserId, cursor.lastRevision)
          : await this.changeLog.changeLogSince(targetUserId, cursor.lastUpdate!);

      // changeLogSince itself is deliberately NOT limited: its rows are small
      // (id arrays), and an unordered LIMIT could drop a fullReset marker row,
      // silently producing a WRONG partial. The memory bomb was materializing
      // the changed items, which the size flip below prevents.
      for (const v of lst) {
        const data = v.data as DynamicObject;
        if (data?.type == SyncType.itemUpdate && Array.isArray(data.items)) {
          for (const itemId of data.items) updatedItemIdsSet.add(itemId);
        } else if (data?.type == SyncType.fullReset) {
          fullResetRequest = true;
          break;
        } else {
          // A row whose type we do not recognise. Full-resetting is correct (SYNC-9: a partial
          // here would leave the client believing it was caught up with a silently wrong library)
          // -- but this used to be a bare console.log with no `fullResetReason`, so the response
          // was indistinguishable from a healthy reset and nothing surfaced the corruption. That is
          // how `{type: null}` rows from user_activity.route.ts went unnoticed. Name it and log it.
          fullResetReason = 'corruptChangeLogRow';
          logger.error('Changelog row has an unrecognised type; forcing a full reset', {
            userId: targetUserId,
            changeLogId: (v as DynamicObject)?.id,
            type: data?.type,
          });
          fullResetRequest = true;
          break;
        }

        // A partial this large is no cheaper than a full sync and one response
        // holding thousands of full items is the 2026-07-05 OOM shape. Flip to
        // fullReset: chunked clients get ids-only and page the details.
        // Chunked clients ONLY: for a legacy client the flip lands in the
        // single-response 413 below whenever the library exceeds the cap, and
        // because changelog rows persist (~90-day retention) every retry
        // re-trips it — a wedged install. Serve legacy clients the oversized
        // partial instead (the pre-cap behavior, bounded by library size);
        // availability wins until the fleet is chunk-capable.
        if (opts.chunked && updatedItemIdsSet.size > SyncService.PARTIAL_MAX_CHANGED_IDS) {
          fullResetRequest = true;
          break;
        }
      }
    }

    // ************************FULL RESET***********************
    // If full reset requested, return full reset
    if (fullResetRequest) {
      // Chunk-capable clients get ids only; they page details via fetchItemIds.
      // A huge library serialized in one response has OOM-crashed prod
      // (2026-07-05), so never build the full item payload for these clients.
      if (opts.chunked) {
        return {...(await this._chunkedFullReset(ctx, targetUserId)), revision, fullResetReason};
      }

      // Legacy single-response full sync. Refuse to serialize a huge library
      // in one payload — the July 2026 OOM path. The count query is ids-only
      // and cheap. Deliberately an ERROR, never `fullReset` with empty
      // updatedItems: a legacy client would treat that as an authoritative
      // empty library and wipe its local state.
      const libraryIds = await this.itemlistService.listLibraryItemIdsForUser(ctx, targetUserId);
      if (libraryIds.length > SyncService.SINGLE_RESPONSE_MAX_ITEMS) {
        throw new HttpException(
          413,
          `Library too large (${libraryIds.length} items) for single-response sync; ` +
            'a client update with chunked sync support is required.',
        );
      }

      const syncData = await this._syncAll(ctx, targetUserId);
      if (config.devMode) {
        console.log('Synced items (full reset)', syncData.totalUpdates);
      }
      return {...syncData, revision, fullResetReason};
    }

    // Otherwise, get changed items only

    return {...(await this._syncPartial(ctx, targetUserId, updatedItemIdsSet, opts.chunked === true)), revision};
  }

  /**
   * Has the purge taken anything this client had not seen yet?
   *
   * The cursor names a row that existed when it was issued. If it sits below the
   * oldest row that still exists, that row was purged -- and because ids are
   * monotonic with time and the purge deletes by `createdAt`, everything between
   * went with it. A user with no surviving rows at all cannot have a gap worth
   * detecting: there is nothing to be behind on.
   *
   * Conservative in the right direction. The one case it over-reports is a client
   * whose cursor predates the user's first-ever changelog row, which costs one
   * unnecessary full reset on an account that would be doing one anyway.
   */
  private async _cursorPredatesRetention(targetUserId: string, cursor: SyncCursor): Promise<boolean> {
    if (cursor.lastRevision != null) {
      // 0 means "I synced when this user had no changelog rows at all". Every id
      // since is above it, so it cannot be pointing into a purged range. Any other
      // value names a row that existed when it was issued, so sitting below the
      // oldest survivor means that row is gone -- and ids are monotonic with time
      // while the purge deletes by `createdAt`, so everything between went with it.
      if (cursor.lastRevision === 0) return false;
      const oldest = await this.changeLog.oldestRevisionForUser(targetUserId);
      return oldest != null && cursor.lastRevision < oldest;
    }

    if (cursor.lastUpdate) {
      // A date cursor carries no id, so it is judged against the retention window
      // itself. Deliberately NOT against the oldest surviving row: that fires for
      // any young account whose changelog happens to be newer than the client's
      // cursor -- an ordinary state minutes after signup, and not a gap at all.
      return cursor.lastUpdate.getTime() < Date.now() - EXTENDED_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    }

    return false;
  }

  // Ids-only fullReset payload for chunk-capable clients; details are paged
  // via fetchItemIds requests.
  private async _chunkedFullReset(ctx: RequestContext, targetUserId: string): Promise<ItemChangeLogUpdate> {
    const chunkedItemIds = await this.itemlistService.listLibraryItemIdsForUser(ctx, targetUserId);
    if (config.devMode) {
      console.log('Synced items (full reset, chunked ids)', chunkedItemIds.length);
    }
    return {
      fullReset: true,
      totalUpdates: chunkedItemIds.length,
      updatedItems: [],
      removedItemIds: [],
      chunkedItemIds,
    };
  }

  async _syncAll(ctx: RequestContext, targetUserId: string): Promise<ItemChangeLogUpdate> {
    if (!targetUserId) {
      throw 'Error ';
    }

    const items = await this.itemlistService.listAllItemsWithInfoByUser(
      ctx,
      targetUserId,
      true, // includePermissions
    );

    const removedItemIds = [];

    return {
      fullReset: true,
      totalUpdates: items.length,
      updatedItems: items,
      removedItemIds,
    };
  }

  private async _syncPartial(
    ctx: RequestContext,
    targetUserId: string,
    updatedItemIdsSet: Set<string>,
    chunked: boolean = false,
  ): Promise<ItemChangeLogUpdate> {
    // ************************ADDED ITEMS***********************
    // Cases:
    // 1 - items in change log
    // 2 - items in collections that were added

    const updatedItemsInLibrary =
      updatedItemIdsSet.size > 0
        ? await this.itemlistService.listItemsWithInfoByUserForItemIds(
            ctx,
            targetUserId,
            updatedItemIdsSet,
            true, // includePermissions
          )
        : [];

    const updatedItemIdsInLibrarySet = new Set(updatedItemsInLibrary.map((v: any) => v.details._id));

    const updatedCollectionsInLibrary = updatedItemsInLibrary
      .filter((v) => v.details.type == ItemTypeEnum.collection)
      .map((v) => v.details);

    const updatedCollectionIds = updatedCollectionsInLibrary.map((v) => v._id);

    // get items added because collection was added
    const additionalAddedItemIdsSet = new Set(
      (await this.itemRelationService._getCollectionsRelationsForMultiple(updatedCollectionIds)).map((v) => v.itemId),
    );

    // The changed-id flip in runSync only counts changelog ids; collection
    // expansion is the other unbounded axis (one shared collection can carry
    // tens of thousands of members off a single changelog id — the same
    // 2026-07-05 OOM shape). Flip chunk-capable clients to an ids-only
    // fullReset before materializing. Legacy clients keep the pre-cap
    // behavior, same availability tradeoff as the runSync flip.
    if (chunked) {
      const combinedSize = new Set([...updatedItemIdsInLibrarySet, ...additionalAddedItemIdsSet]).size;
      if (combinedSize > SyncService.PARTIAL_MAX_CHANGED_IDS) {
        return await this._chunkedFullReset(ctx, targetUserId);
      }
    }

    const additionalAddedItems =
      additionalAddedItemIdsSet.size > 0
        ? await this.itemlistService.listItemsWithInfoByUserForItemIds(
            ctx,
            targetUserId,
            additionalAddedItemIdsSet,
            true, // includePermissions
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
    const removedIds = Array.from(updatedItemIdsSet).filter((v) => !updatedItemIdsInLibrarySet.has(v));

    if (removedIds.length > 0) {
      const currentCollectionIdSet = new Set(
        await this.itemService._listUserCollectionIdsWithPermissionType(targetUserId),
      );
      const removedItems = await this.itemlistService.getItemsByIds(ctx.accountId, removedIds);
      const removedColIds = removedItems
        .filter((v) => v.type == ItemTypeEnum.collection && !currentCollectionIdSet.has(v._id))
        .map((v) => v._id);

      const itemIdsFromRemovedCollections = (
        await this.itemRelationService._getCollectionsRelationsForMultiple(removedColIds)
      ).map((v) => v.itemId);
      const relationsForItemIdsFromRemovedCollections =
        await this.itemRelationService._getMultipleItemRelations(itemIdsFromRemovedCollections);

      // check if user still has access to item via other collection, if yes, use to filter out from removed
      const remainingIdsSet = new Set(
        relationsForItemIdsFromRemovedCollections
          .filter((v) => currentCollectionIdSet.has(v.collectionId))
          .map((v) => v.itemId),
      );
      const additionalRemovedItemIds = itemIdsFromRemovedCollections.filter((v) => !remainingIdsSet.has(v));
      removedItemIds = [...removedIds, ...additionalRemovedItemIds];
    }

    const totalUpdates = updatedItems.length + removedItemIds.length;

    // if (config.devMode) {
    //   console.log("Synced items (partial update)", updatedItems.length, removedItemIds.length);

    //   //TODO: bug should not be removed
    //   console.log("  --- Synced items items", { updatedItemIds: updatedItems.map(v => v.itemId), removedItemIds });
    // }

    return {
      fullReset: false,
      totalUpdates,
      updatedItems,
      removedItemIds,
    };
  }
}

export default SyncService;
