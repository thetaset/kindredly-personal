import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper} from '../utils/auth_utils';

import NotificationService from '@/services/notification.service';
import {RequestContext} from '@/base/request_context';
import {container} from '@/inversify.config';

class UserNotificationsRoute implements Routes {
  public router = Router();

  private notificationService = container.resolve(NotificationService);

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/user/notification/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/remove'>, res) => {
        const results = await this.notificationService.removeNotificationById(
          RequestContext.instance(req),
          (req.query.id as string) || req.body.id,
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
      '/user/notification/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/list'>, res) => {
        const results = await this.notificationService.listUserNotifcations(
          RequestContext.instance(req),
          req.body.pageInfo,
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
      '/user/notification/markRead',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/markRead'>, res) => {
        const results = await this.notificationService.markNotificationsAsRead(
          RequestContext.instance(req),
          req.body.ids,
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
      '/user/notification/markUnread',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/markUnread'>, res) => {
        const results = await this.notificationService.markNotificationsAsUnread(
          RequestContext.instance(req),
          req.body.ids,
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
      '/user/notification/count',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/count'>, res) => {
        const results = await this.notificationService.countUserNotifcations(RequestContext.instance(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/notification/clear',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/clear'>, res) => {
        const results = await this.notificationService.clearNotifications(RequestContext.instance(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );
  }
}

export default UserNotificationsRoute;
