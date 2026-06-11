import {UserRepo} from '@/db/user.repo';
import {UserChangeLogRepo} from '@/db/user_changelog.repo';
import {RequestContext} from '@/base/request_context';

import PermissionService from './permission.service';
import SSEManager from './sse.manager';
import {logger} from '@/utils/logger';

class ChangeLogService {
  private changeLogRepo = new UserChangeLogRepo();
  private permissionService = new PermissionService();
  private sseManager = SSEManager.getInstance();

  // ROUTE-METHOD
  async logItemChange(ctx: RequestContext, itemId: string, sourceId = undefined, changeType = 'itemUpdate') {
    if (!itemId) return false;
    const userIds = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, itemId, true);
    await this.logItemChangeForUserIds(userIds, [itemId], sourceId, changeType);
    return true;
  }

  // ROUTE-METHOD
  async logRemovalOfItems<T>(ctx: RequestContext, itemIds: string[], fn: () => Promise<T>) {
    let userIdGroups = [];
    for (const itemId of itemIds) {
      if (!itemId) continue;
      const userIds = await this.permissionService._listUserIdsWithPermissionsToItem(ctx, itemId, true);
      userIdGroups.push(userIds);
    }
    let result: T = await fn();
    for (let i = 0; i < itemIds.length; i++) {
      let userIds = userIdGroups[i];
      let itemId = itemIds[i];

      await this.logItemChangeForUserIds(userIds, [itemId]);
    }
    return result;
  }

  // ROUTE-METHOD
  async logItemChangeForUserIds(userIds: string[], itemIds: string[], sourceId = undefined, changeType = 'itemUpdate') {
    const data = {type: changeType, sourceId, items: itemIds};

    for (const userId of userIds) {
      // Add changelog entry to database
      this.changeLogRepo.addChangeLogEntry(userId, sourceId, data).catch((e) => {
        logger.error('Error adding change log entry', e, {userId, sourceId, data});
      });

      // Broadcast real-time notification via Redis to all connected clients for this user
      this.sseManager
        .broadcastToUser(userId, 'syncUpdate', {
          type: changeType,
          sourceId,
          items: itemIds,
          timestamp: new Date().toISOString(),
          userId,
        })
        .catch((e) => {
          logger.error('Error broadcasting item change via SSE', e, {userId, changeType, itemIds});
        });
    }

    return true;
  }
}

export default ChangeLogService;
