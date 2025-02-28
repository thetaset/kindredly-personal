import { UserActivityRepo } from '@/db/user_activity.repo';
import { ItemFeedbackRepo } from '@/db/item_feedback.repo';
import { DynObj } from '@/types';
import FeedbackService from './feedback.service';
import { RequestContext } from '../base/request_context';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';
import { UserActivityLogRepo } from '@/db/user_activity_log.repo';
import { UserType } from 'tset-sharedlib/shared.types';
import UserActivityLog from '@/schemas/public/UserActivityLog';

class ActivityService {
  private feedbackService = new FeedbackService();
  private userActivity = new UserActivityRepo();
  private userActivityLogRepo = new UserActivityLogRepo();
  private feedback = new ItemFeedbackRepo();

  async getActivityEntryById(id: string) {
    return await this.userActivity.findById(id);
  }

  async listUserActivityLogSince(ctx: RequestContext, targetUserId: string, type: string, options: { createdAt?: Date }={}): Promise<{ userActivityLog: UserActivityLog[] }> {
    await ctx.verifySelfOrAdmin(targetUserId);

    const { createdAt } = options || {};

    let selectBy = { userId: targetUserId };
    if (type != '*') selectBy['type'] = type;
    const results = await this.userActivityLogRepo
      .findMany(selectBy)
      .where('createdAt', '>=', createdAt)
      .orderBy('createdAt', 'desc');

    return { userActivityLog: results };
  }

  async clearUsageLog(ctx: RequestContext, targetUserId: string) {
    await ctx.verifySelfOrAdminOverUser(targetUserId);
    await this.userActivityLogRepo.deleteWhere({ userId: targetUserId });
    return true;
  }

  // TODO: not done
  // ROUTE-METHOD
  async saveUserActivityLog(
    ctx: RequestContext,
    monitorId: string,
    createdAt: number,
    updatedAt: number,
    type: string,
    data: DynObj,
    encInfo: DynObj,
    complete: boolean,
  ) {
    const _id = `${ctx.currentUserId}_${monitorId}`;

    const clientId = ctx.getClientId();

    const info = {
      _id,
      userId: ctx.currentUserId,
      monitorId: monitorId,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      type: type,
      data,
      encInfo,
      complete,
      encrypted: encInfo != null,
    };

    try {
      await this.userActivityLogRepo.create(info);
    } catch (e) {
      return true;
    }

    return true;
  }

  async listUserActivity(ctx: RequestContext, targetUserId, options) {
    await ctx.verifySelfOrAdmin(targetUserId);

    const { currentPage = 0, perPage = 100, includeTotalRows } = options;
    const results = await this.userActivity
      .findMany({ userId: targetUserId })
      .limit(perPage)
      .offset(currentPage)
      .orderBy('createdAt', 'desc');

    if (!includeTotalRows) return { userActivity: results, count: null };
    const count = await this.userActivity.countRows({ userId: targetUserId });
    return { userActivity: results, count };
  }

  async removeActivityEntry(ctx: RequestContext, targetUserId: string, id) {
    await ctx.isAdmin();
    return await this.userActivity.deleteWhere({ _id: id, userId: targetUserId });
  }

  async deleteAllForUser(ctx: RequestContext, targetUserId: string) {
    await ctx.verifyAdminPermissions(targetUserId);
    return await this.userActivity.deleteWhere({ userId: targetUserId });
  }

  async updateLastVisited(userId, itemId) {
    const now = new Date();
    const id = this.feedbackService.feedbackId(userId, itemId);
    const data = await this.feedbackService._getItemFeedbackById(id);

    if (!data) {
      await this.feedback.create({
        _id: id,
        userId,
        itemId,
        lastVisit: now,
        visitTime: now,
        visitCount: 1,
      });
    } else {
      // check if more than 15 minutes have passed since last visit
      const countVisit =
        !data.visitTime || data.visitTime < new Date(Date.now() - config.visitCountThresholdSec * 1000);
      data.lastVisit = data.visitTime;
      data.visitTime = now;
      if (countVisit) data.visitCount += 1;
      await this.feedback.updateWithId(id, { lastVisit: now, visitTime: now, visitCount: data.visitCount });
    }

    return;
  }

  async logCollectionVisit(
    ctx: RequestContext,
    id: string
  ) {
    await this.updateLastVisited(ctx.currentUserId, id);
    return null;
  }

  async logVisit(
    ctx: RequestContext,
    activityType: string,
    url: string,
    info: DynObj = {},
    matchingItemIds: string[],
    blocked: boolean,
    context: DynObj = {},
    encInfo: DynObj,
  ) {
    const now = new Date();
    const userId = ctx.currentUserId;

    for (const itemId of matchingItemIds) await this.updateLastVisited(userId, itemId);

    const user = await ctx.getCurrentUser();

    const encrypted = encInfo != null;
    const logActivity = user?.type == UserType.restricted || (user?.options?.logActivity == true && encrypted);

    if (logActivity) {
      const _id = `ua_` + uuidv4();
      const entry = {
        _id: _id,
        userId: userId,
        info: info,
        url: url,
        activityType: activityType,
        blocked: blocked,
        context: context,
        createdAt: now,
        encInfo,
        encrypted: encrypted,
      };
      try {
        await this.userActivity.create(entry);
      } catch (e) {
        return null;
      }
    }

    return null;
  }
}

export default ActivityService;
