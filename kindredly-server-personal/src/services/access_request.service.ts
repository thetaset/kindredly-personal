import {RequestContext} from '@/base/request_context';
import {config} from '@/config';
import {v4 as uuidv4} from 'uuid';

import NotificationService from './notification.service';
import EventAuditService from './record_event.service';
import {AccessRequestRepo} from '@/db/access_request.repo';
import {NotificationType} from '@/typing/enum_strings';
import User from 'tset-sharedlib/schemas/public/User';
import {container} from '@/inversify.config';

class AccessRequestService {
  private notificationsService = container.resolve(NotificationService);
  private accessRequests = new AccessRequestRepo();
  private auditService = new EventAuditService();

  private _getLocalMidnight(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private _parseTimeReqDateFromKey(key?: string | null): Date | null {
    if (!key) return null;
    if (!key.startsWith('TIMEREQ_')) return null;
    // Key format: TIMEREQ_YYYY-M-D H:00
    const match = /^TIMEREQ_(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(key);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private _getExpiresAtTsFromDetails(details: any): number | null {
    if (!details) return null;
    const ts = (details as any).expiresAtTs;
    if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
    const iso = (details as any).expiresAt;
    if (typeof iso === 'string') {
      const parsed = Date.parse(iso);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private _shouldAutoExpire(accessRequest: any, now: Date): boolean {
    // Only auto-expire pending requests.
    if ((accessRequest?.status || null) !== 'requested') return false;

    const details = accessRequest?.details;
    const explicitExpiresAtTs = this._getExpiresAtTsFromDetails(details);
    if (explicitExpiresAtTs != null) {
      return explicitExpiresAtTs <= now.getTime();
    }

    // Backward compatibility: older time requests encode the date in the key.
    if (accessRequest?.type === 'time') {
      const reqDate = this._parseTimeReqDateFromKey(accessRequest?.key);
      if (!reqDate) return false;
      const todayStart = this._getLocalMidnight(now).getTime();
      return reqDate.getTime() < todayStart;
    }

    return false;
  }

  private async _autoExpireRequests(ctx: RequestContext): Promise<void> {
    if (!ctx.accountId) return;

    const now = new Date();

    // Keep the scan bounded; access requests should be low volume.
    const candidates = await this.accessRequests
      .findMany({accountId: ctx.accountId, status: 'requested'} as any)
      .orderBy('createdAt', 'asc')
      .limit(500);

    for (const request of candidates as any[]) {
      if (!this._shouldAutoExpire(request, now)) continue;
      try {
        await this.removeAccessRequestById(ctx, request._id);
      } catch (err) {
        // Best-effort cleanup; listing should still succeed.
        console.warn('[access_request] Failed to auto-expire request', {
          id: request?._id,
          type: request?.type,
          key: request?.key,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ROUTE-METHOD
  async listAllAccessRequestsInAccount(ctx: RequestContext) {
    await ctx.verifyCurrentUserIsAdmin();
    await this._autoExpireRequests(ctx);
    let allRecords = await this.accessRequests.fetchAccessRequests(ctx.accountId);
    return allRecords;
  }

  // ROUTE-METHOD
  async countAccessRequestsInAccount(ctx: RequestContext) {
    await this._autoExpireRequests(ctx);
    return await this.accessRequests.countRows({accountId: ctx.accountId});
  }

  // ROUTE-METHOD
  async listAccessRequestsByRequesterId(ctx: RequestContext, requesterId: string) {
    if (ctx.currentUserId != requesterId) await ctx.verifyAdminPermissions(requesterId);
    await this._autoExpireRequests(ctx);
    return await this.accessRequests
      .findMany({requesterId, accountId: ctx.accountId})
      .orderBy('createdAt', 'desc')
      .limit(100);
  }

  // ROUTE-METHOD
  async removeAccessRequestById(ctx: RequestContext, id: string) {
    return await this.accessRequests.deleteWithId(id, {accountId: ctx.accountId});
  }

  // ROUTE-METHOD
  async addAccessRequest(ctx: RequestContext, key: string, type: string, details: any, message: string) {
    // const existingRequest = await this._getAccessRequestByRequesterAndKey(ctx, key);
    // if (existingRequest.length > 0) {
    //   return null;
    // }

    const accessRequestId = 'arq_' + uuidv4();
    const requester = await ctx.getCurrentUser();

    const currentTimeSt = new Date();

    const info = {
      _id: accessRequestId,
      key: key,
      type: type || 'url',
      accountId: ctx.accountId,
      requesterId: ctx.currentUserId,
      createdAt: currentTimeSt,
      updatedAt: currentTimeSt,
      status: 'requested',
      details: details,
      requesterNote: message,
      approverNote: null,
    };
    await this.accessRequests.create(info);

    this.auditService.recordEvent({
      eventName: 'ACCESS_REQUEST',
      eventType: 'explicit',
      eventInfo: {key, requesterId: ctx.currentUserId},
      accountId: ctx.accountId,
      userId: ctx.currentUserId,
    });

    await this.notificationsService.sendAccessRequestNotification(ctx, requester, accessRequestId, key);

    return accessRequestId;
  }

  // ROUTE-METHOD
  async processAccessRequest(ctx: RequestContext, id: string, status: string, approverNote: string) {
    let message = '';
    const accessrequest = await this._getAccessRequestById(ctx, id);

    const isApproved = status === 'approved' || status === 'done';

    if (ctx.accountId != accessrequest.accountId) throw new Error('Access denied');
    const isActionRequest = accessrequest.type === 'action';

    // For action requests we keep approved entries so they can be consumed by the action itself.
    // Denied/closed requests can be deleted immediately.
    if (!isActionRequest) {
      await this.removeAccessRequestById(ctx, id);
    } else {
      if (isApproved) {
        await this.accessRequests.updateWithId(accessrequest._id, {
          status: 'approved',
          approverNote: approverNote ?? null,
          updatedAt: new Date(),
        } as any);
      } else {
        await this.removeAccessRequestById(ctx, id);
      }
    }

    let title = 'Request ';
    if (isApproved) {
      title += 'Granted';
      message = isActionRequest
        ? `Request GRANTED for ${accessrequest.key}.`
        : `Request GRANTED for <a href="${accessrequest.key}">${accessrequest.key}</a>. `;
    } else {
      title += 'Denied';
      message = `Request DENIED for ${accessrequest.key}`;
    }

    const notificationData = {
      title: title,
      message: message,
      additionalMessage: approverNote,
      refInfo: {
        requestId: id,
        resourceType: isActionRequest ? 'action' : 'url',
        resourceURL: accessrequest.key,
        approvalStatus: isApproved ? 'approved' : status,
      },
    };

    await this.notificationsService.addUserNotification(
      ctx,
      NotificationType.ACCESS_REQUEST_UPDATE,
      ctx.currentUserId,
      ctx.accountId,
      accessrequest.requesterId,
      notificationData,
      true,
    );
    return {};
  }

  async _getAccessRequestById(ctx: RequestContext, id: string) {
    const accessRequest = await this.accessRequests.findById(id, {accountId: ctx.accountId});
    if (accessRequest.accountId != ctx.accountId) throw new Error('Request not found');

    return accessRequest;
  }

  async _getAccessRequestByRequesterAndKey(ctx: RequestContext, key) {
    return await this.accessRequests.findMany({requesterId: ctx.currentUserId, key});
  }
}

export default AccessRequestService;
