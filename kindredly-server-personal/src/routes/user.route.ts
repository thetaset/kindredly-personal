import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {checkEmail} from '@/utils/user.utils';
import {
  authenticateJWT,
  authenticateOptionalJWT,
  errorHelper,
  getTargetUserId,
  prepUserForTransport,
  removeSensitiveInfoFromUser,
} from '../utils/auth_utils';

import UserService from '@/services/user.service';

import AccessRequestService from '@/services/access_request.service';
import ClientInfoService from '@/services/client_info.service';
import NotificationService from '@/services/notification.service';
import {RequestContext} from '@/base/request_context';
import UserFeedService from '@/services/user_feed.service';

import {container} from '@/inversify.config';
import {MiscNotificationStats} from 'tset-sharedlib/shared.types';

class UserRoute implements Routes {
  public router = Router();

  private userService = new UserService();
  private clientInfoService = new ClientInfoService();

  private notificationService = container.resolve(NotificationService);

  private accessRequestService = new AccessRequestService();

  private feedService = new UserFeedService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/user/current',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/current'>, res) => {
        const user = await this.userService.getCurrentUserInfo(RequestContext.instance(req));
        if (user.disabled || user.deleted) {
          console.log('User is disabled or deleted');
        }
        prepUserForTransport(user);
        removeSensitiveInfoFromUser(user);

        const result = {
          success: true,
          results: user,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    // Auth Not Required
    this.router.post(
      '/user/public/get',
      authenticateOptionalJWT,
      errorHelper(async (req: ApiReq<'/user/public/get'>, res) => {
        const id = req.body.id;
        const data = await this.userService.getUserPublicProfileById(id);
        const result = {
          success: true,
          results: data,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/mypublicprofile',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/mypublicprofile'>, res) => {
        const data = await this.userService.getMyPublicProfile(RequestContext.instance(req));
        const result = {
          success: true,
          results: data,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/miscStats',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/miscStats'>, res) => {
        const ctx = RequestContext.instance(req);
        const notificationCount = await this.notificationService.countUserNotifcations(ctx);
        const notificationCountUnread = await this.notificationService.countUnreadUserNotifcations(ctx);
        const unreadFeedItems = await this.feedService.countUnreadByUserId(ctx);
        const accessRequestCount = await this.accessRequestService.countAccessRequestsInAccount(ctx);

        const result = {
          success: true,
          results: {
            notificationCount: notificationCount,
            notificationCountUnread: notificationCountUnread,
            unreadFeedItems: unreadFeedItems,
            accessRequestCount: accessRequestCount,
          } as MiscNotificationStats,
        };
        res.json(result);
      }),
    );

    if (process.env.NODE_ENV === 'development') {
      this.router.post(
        '/user/debug',
        authenticateJWT,
        errorHelper(async (req: ApiReq<'/user/debug'>, res) => {
          const results = await this.userService.debugUser(RequestContext.instance(req), req.body.data);
          const result = {
            success: true,
            results: results,
          };
          res.json(result);
        }),
      );
    }

    // SCH-OK
    this.router.post(
      '/user/info',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/info'>, res) => {
        const user = await this.userService.getUserInfo(RequestContext.instance(req), getTargetUserId(req));

        const result = {
          success: true,
          results: user,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/userType/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/userType/update'>, res) => {
        await this.userService.setUserType(RequestContext.instance(req), req.body.userId, req.body.type);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/publishing/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/publishing/update'>, res) => {
        await this.userService.setCanPublishPublicly(
          RequestContext.instance(req),
          req.body.userId,
          req.body.canPublishPublicly,
        );
        res.json({success: true, results: {}});
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/email/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/email/update'>, res) => {
        checkEmail(req.body.email);
        await this.userService.setEmail(RequestContext.instance(req), getTargetUserId(req), req.body.email);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/sendEmailVerification',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/sendEmailVerification'>, res) => {
        await this.userService.sendEmailVerification(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/info/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/info/update'>, res) => {
        await this.userService.setDisplayedName(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body?.data?.displayedName,
        );

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/info/updateUsername',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/info/updateUsername'>, res) => {
        await this.userService.updateUsername(RequestContext.instance(req), getTargetUserId(req), req.body?.username);

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/delete',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/delete'>, res) => {
        const results = await this.userService.softDeleteUser(RequestContext.instance(req), req.body.userIdToDelete);

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/client/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/list'>, res) => {
        const results = await this.clientInfoService.listClients(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/client/updateDeviceToken',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/updateDeviceToken'>, res) => {
        const results = await this.clientInfoService.updateDeviceToken(
          RequestContext.instance(req),
          req.body.deviceToken,
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
      '/user/client/listManagedSessions',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/listManagedSessions'>, res) => {
        const results = await this.clientInfoService.listManagedSessions(
          RequestContext.instance(req),
          getTargetUserId(req),
        );
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/client/sendDebugToast',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/sendDebugToast'>, res) => {
        const results = await this.clientInfoService.sendEncryptedDebugToast(RequestContext.instance(req), req.body);

        res.json({
          success: true,
          results,
        });
      }),
    );

    this.router.post(
      '/user/client/remoteAction/queue',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/remoteAction/queue'>, res) => {
        const results = await this.clientInfoService.queueManagedRemoteAction(RequestContext.instance(req), req.body);

        res.json({
          success: true,
          results,
        });
      }),
    );

    this.router.post(
      '/user/client/remoteAction/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/remoteAction/status'>, res) => {
        const results = await this.clientInfoService.getManagedRemoteActionStatus(
          RequestContext.instance(req),
          req.body,
        );

        res.json({
          success: true,
          results,
        });
      }),
    );

    this.router.post(
      '/user/client/remoteAction/ack',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/client/remoteAction/ack'>, res) => {
        const results = await this.clientInfoService.ackManagedRemoteAction(RequestContext.instance(req), req.body);

        res.json({
          success: true,
          results,
        });
      }),
    );
  }
}

export default UserRoute;
