import { RequestContext } from '@/base/request_context';
import { config } from '@/config';
import { v4 as uuidv4 } from 'uuid';

import NotificationService from './notification.service';
import EventAuditService from './record_event.service';
import { AccessRequestRepo } from '@/db/access_request.repo';
import { NotificationType } from '@/typing/enum_strings';
import User from '@/schemas/public/User';
import { container } from '@/inversify.config';

class AccessRequestService {
  private notificationsService =  container.resolve(NotificationService);
  private accessRequests = new AccessRequestRepo();
  private auditService = new EventAuditService();

  // ROUTE-METHOD
  async listAllAccessRequestsInAccount(ctx: RequestContext) {
    ctx.verifyCurrentUserIsAdmin();
    let allRecords = await this.accessRequests.fetchAccessRequests(ctx.accountId);
    return allRecords;
  }

  // ROUTE-METHOD
  async countAccessRequestsInAccount(ctx: RequestContext) {
    return await this.accessRequests.countRows({ accountId: ctx.accountId });
  }

  // ROUTE-METHOD
  async listAccessRequestsByRequesterId(ctx: RequestContext, requesterId: string) {
    if (ctx.currentUserId != requesterId) await ctx.verifyAdminPermissions(requesterId);
    return await this.accessRequests.findMany({ requesterId, accountId: ctx.accountId }).limit(1000);
  }

  // ROUTE-METHOD
  async removeAccessRequestById(ctx: RequestContext, id: string) {
    return await this.accessRequests.deleteWithId(id, { accountId: ctx.accountId });
  }

  // ROUTE-METHOD
  async addAccessRequest(ctx: RequestContext, key: string, additionalInfo: any, message: string) {
    const existingRequest = await this._getAccessRequestByRequesterAndKey(ctx, key);
    if (existingRequest.length > 0) {
      return null;
    }

    const accessRequestId = 'arq_' + uuidv4();
    const requester = await ctx.getCurrentUser();

    const currentTimeSt = new Date();

    const info = {
      _id: accessRequestId,
      key: key,
      accountId: ctx.accountId,
      requesterId: ctx.currentUserId,
      createdAt: currentTimeSt,
      updatedAt: currentTimeSt,
      status: 'requested',
      requesterNote: message,
      approverNote: null,
    };
    await this.accessRequests.create(info);


    this.auditService.recordEvent({
      eventName: 'ACCESS_REQUEST',
      eventType: 'explicit',
      eventInfo: { key, requesterId: ctx.currentUserId },
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

    if (ctx.accountId != accessrequest.accountId) throw new Error('Access denied');
    await this.removeAccessRequestById(ctx, id);

    let title = "Request "
    if (status == 'approved') {
      message = `Request GRANTED for <a href="${accessrequest.key}">${accessrequest.key}</a>. `;
      title += "Granted";

    } else {
      message = `Request DENIED for ${accessrequest.key}`;
      title += "Denied"
    }

    const notificationData = {
      title: title,
      message: message,
      additionalMessage: approverNote,
      refInfo: {
        requestId: id,
        resourceType: 'url',
        resourceURL: accessrequest.key,
        approvalStatus: status,
      },
    };

    await this.notificationsService.addUserNotification(
      ctx,
      NotificationType.ACCESS_REQUEST_UPDATE,
      ctx.currentUserId,
      ctx.accountId,
      accessrequest.requesterId,
      notificationData,
      true
    );
    return {};
  }


  async _getAccessRequestById(ctx: RequestContext, id: string) {
    const accessRequest = await this.accessRequests.findById(id, { accountId: ctx.accountId });
    if (accessRequest.accountId != ctx.accountId) throw new Error('Access Request not found');

    return accessRequest;
  }


  async _getAccessRequestByRequesterAndKey(ctx: RequestContext, key) {
    return await this.accessRequests.findMany({ requesterId: ctx.currentUserId, key });
  }


}

export default AccessRequestService;
