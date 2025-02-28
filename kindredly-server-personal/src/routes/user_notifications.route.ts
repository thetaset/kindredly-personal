import { Routes } from '@interfaces/routes.interface';
import { Router } from 'express';

import { authenticateJWT, errorHelper } from '../utils/auth_utils';


import NotificationService from '@/services/notification.service';
import { RequestContext } from '@/base/request_context';
import * as UserNotificationsPaths from 'tset-sharedlib/api/UserNotificationsPaths';
import { container } from '@/inversify.config';

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
      UserNotificationsPaths.REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.notificationService.removeNotificationById(
          RequestContext.instance(req),
          req.query.id || req.body.id,
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
      UserNotificationsPaths.LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.notificationService.listUserNotifcations(RequestContext.instance(req),req.body.pageInfo);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      UserNotificationsPaths.MARK_READ,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.notificationService.markNotificationsAsRead(RequestContext.instance(req), req.body.ids);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      UserNotificationsPaths.MARK_UNREAD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.notificationService.markNotificationsAsUnread(RequestContext.instance(req), req.body.ids);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      UserNotificationsPaths.COUNT,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserNotificationsPaths.CLEAR,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
