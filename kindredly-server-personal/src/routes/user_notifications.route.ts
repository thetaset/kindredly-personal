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
    // A child's own device: they finished a part of a built-in lesson pack (HAT-577). The
    // service decides who is told and what it says; the request carries nothing.
    this.router.post(
      '/user/notification/lessonPartDone',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/lessonPartDone'>, res) => {
        const results = await this.notificationService.addLessonPartDoneNotification(RequestContext.instance(req));
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    // A child's own device: they asked for a Helper AI helper (HAT-1105). The service decides who is
    // told and what it says; the request carries nothing, so its words never reach the server.
    this.router.post(
      '/user/notification/helperAsked',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/helperAsked'>, res) => {
        const results = await this.notificationService.addHelperRequestNotification(RequestContext.instance(req));
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    // A child's own device: their helper asked their adults a question (HAT-1105, HAI-10). Carries
    // nothing; the question stays in the child's encrypted progress.
    this.router.post(
      '/user/notification/helperQuestion',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/notification/helperQuestion'>, res) => {
        const results = await this.notificationService.addHelperRequestNotification(
          RequestContext.instance(req),
          Date.now(),
          'question',
        );
        res.json({success: true, results});
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
