import {UserRepo} from '@/db/user.repo';
import {SyncChangeLogData, SyncType, UserChangeLogRepo} from '@/db/user_changelog.repo';
import {RequestContext} from '@/base/request_context';

import PermissionService from './permission.service';
import SSEManager from './sse.manager';
import {logger} from '@/utils/logger';

class ChangeLogService {
  private changeLogRepo = new UserChangeLogRepo();
  private permissionService = new PermissionService();
  private sseManager = SSEManager.getInstance();

  // ROUTE-METHOD
  /**
   * The recipient set here is WIDER than a direct-permission lookup: it is owner +
   * directly-assigned + inherited from parent collections. Someone who can see an
   * item only because it sits in a collection shared with them is in this set and
   * is NOT in `_listUserIdsOfAllUserWithDirectPermissionsToItems`. Anything that
   * changes an item must use this one, or those people never hear about the edit.
   * SYNC-2.
   */
  async logItemChange(ctx: RequestContext, itemId: string, changeType: SyncType.itemUpdate = SyncType.itemUpdate) {
    if (!itemId) return false;
    const userIds = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, itemId, true);
    await this.logItemChangeForUserIds(userIds, [itemId], changeType);
    return true;
  }

  // ROUTE-METHOD
  async logRemovalOfItems<T>(ctx: RequestContext, itemIds: string[], fn: () => Promise<T>) {
    // Recipients are resolved BEFORE the callback runs: afterwards the permission rows
    // have been deleted along with the item, so there is nobody left to notify.
    //
    // Pairs rather than two parallel arrays. The previous form pushed to `userIdGroups`
    // only for truthy ids but read it back by the `itemIds` index, so ONE falsy id shifted
    // every later item onto the wrong recipient list and then ran off the end of the array.
    // Callers pass `[req.body.itemId]` straight from the request body (item.route.ts, the
    // removeFromParent and archiveUpdate handlers), so a request with no itemId reaches
    // this. SYNC-12.
    const pending: {itemId: string; userIds: string[]}[] = [];
    for (const itemId of itemIds) {
      if (!itemId) continue;
      const userIds = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, itemId, true);
      pending.push({itemId, userIds});
    }

    const result: T = await fn();

    // Deliberately AFTER the removal, not before. Logging first would be recoverable when
    // the write fails, but it wakes every client via SSE into a window where the item is
    // still present -- they would re-read it as live, advance their cursor past the row,
    // and never hear about the deletion. That trades a rare failure path for a race on the
    // common one. The failure path is SYNC-7's job: one transaction over both writes makes
    // the ordering question moot.
    for (const {itemId, userIds} of pending) {
      await this.logItemChangeForUserIds(userIds, [itemId]);
    }

    return result;
  }

  // ROUTE-METHOD
  /**
   * The ONE way to record that something changed. Everything -- routes and services
   * alike -- goes through here, so a change is always journalled, always moves the
   * cursor, and always nudges connected devices. There used to be a second path on
   * the repo (`logLastUpdateForUsers`) that wrote the row and skipped the broadcast,
   * so five kinds of change -- permission grants above all -- only reached a device
   * on its next poll. SYNC-2 removed it; do not reintroduce a write that does not
   * broadcast.
   */
  async logItemChangeForUserIds(
    userIds: string[],
    itemIds: string[],
    changeType: SyncType.itemUpdate = SyncType.itemUpdate,
  ) {
    // Nothing to record and nobody to wake. Also keeps an empty list out of the
    // batched insert below, which is pinned by a test.
    if (userIds.length === 0) return true;

    const data: SyncChangeLogData = {type: changeType, items: itemIds};

    // The changelog row IS the sync contract -- delta sync is built entirely on it.
    // A dropped row means no client ever learns about this change: nothing detects
    // the gap and nothing triggers a full reset. For an update that self-heals on
    // the next edit; for a DELETE it never does, because the row is gone and nothing
    // will mention that id again, so the client keeps a phantom item until an
    // INDEX_VERSION bump. This must therefore be awaited AND allowed to throw -- a
    // 500 the caller can retry beats a silent, permanent divergence.
    //
    // One statement for every recipient, not one per recipient. The permission lookup
    // that produced `userIds` is deliberately OUTSIDE this -- it is a multi-query read
    // and has no business inside a write batch. A duplicate row from a retry is
    // harmless: sync.service.ts unions changed ids into a Set. SYNC-5.
    await this.changeLogRepo.addChangeLogEntries(userIds, data);

    this.broadcastItemChangeForUserIds(userIds, itemIds, changeType);

    return true;
  }

  /** Broadcast-only half used after a transaction has already committed its journal rows. */
  broadcastItemChangeForUserIds(
    userIds: string[],
    itemIds: string[],
    changeType: SyncType.itemUpdate = SyncType.itemUpdate,
  ) {
    // SSE is only a nudge -- the client's next poll converges without it.
    // DELIBERATELY NOT AWAITED: a Redis blip must never fail an item save.
    for (const userId of userIds) {
      this.sseManager
        .broadcastToUser(userId, 'syncUpdate', {
          type: changeType,
          items: itemIds,
          timestamp: new Date().toISOString(),
          userId,
        })
        .catch((e) => {
          logger.error('Error broadcasting item change via SSE', e, {userId, changeType, itemIds});
        });
    }
  }
}

export default ChangeLogService;
