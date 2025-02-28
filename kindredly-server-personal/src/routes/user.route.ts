import { Routes } from '@interfaces/routes.interface';
import { Router } from 'express';

import { checkEmail } from '@/utils/user.utils';
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
import { RequestContext } from '@/base/request_context';
import UserFeedService from '@/services/user_feed.service';
import * as UserPaths from 'tset-sharedlib/api/UserPaths';
import { container } from '@/inversify.config';

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
      UserPaths.CURRENT,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.PUBLIC_GET,
      authenticateOptionalJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.MY_PUBLIC_PROFILE,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.MISC_STATS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
          },
        };
        res.json(result);
      }),
    );


    if (process.env.NODE_ENV === 'development') {
      this.router.post(
        UserPaths.DEBUG,
        authenticateJWT,
        errorHelper(async (req, res) => {
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
      UserPaths.INFO,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.USER_TYPE_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.userService.setUserType(RequestContext.instance(req), req.body.userId, req.body.type);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      UserPaths.EMAIL_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.SEND_EMAIL_VERIFICATION,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.INFO_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.INFO_UPDATE_USERNAME,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.userService.updateUsername(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body?.username,
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
      UserPaths.DELETE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.userService.softDeleteUser(
          RequestContext.instance(req),
          req.body.userIdToDelete || req.body.userId,
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
      UserPaths.CLIENT_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserPaths.CLIENT_UPDATE_DEVICE_TOKEN,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
  }
}

export default UserRoute;
