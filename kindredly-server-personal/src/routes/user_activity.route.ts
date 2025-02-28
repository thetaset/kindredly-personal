import { Routes } from '@interfaces/routes.interface';
import { Router } from 'express';

import { authenticateJWT, errorHelper, getTargetUserId } from '../utils/auth_utils';


import ActivityService from '@/services/activity.service';
import { RequestContext } from '@/base/request_context';
import ChangeLogService from '@/services/change_log.service';
import * as UserActivityPaths from 'tset-sharedlib/api/UserActivityPaths';

class UserActivityRoute implements Routes {
  public router = Router();

  private activityService = new ActivityService();
  private changeLogService = new ChangeLogService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.post(
      UserActivityPaths.LOG_COLLECTION_VISIT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);

        await this.activityService.logCollectionVisit(
          ctx,
          req.body.id,
        );
        await this.changeLogService.logItemChangeForUserIds([ctx.currentUserId], req.body.id, null);

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserActivityPaths.LOG_VISIT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);

        await this.activityService.logVisit(
          ctx,
          'visit',
          req.body.url,
          req.body.info,
          req.body.matchingItemIds,
          req.body.blocked,
          req.body.context,
          req.body.encInfo,
        );
        await this.changeLogService.logItemChangeForUserIds([ctx.currentUserId], req.body.matchingItemIds, null);

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserActivityPaths.LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.listUserActivity(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.options,
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
      UserActivityPaths.PUSH,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.saveUserActivityLog(
          RequestContext.instance(req),
          req.body.monitorId,
          req.body.createdAt,
          req.body.updatedAt,
          req.body.type,
          req.body.data,
          req.body.encInfo,
          req.body.complete,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );


   

    this.router.post(
      UserActivityPaths.CLEAR_USAGE_LOG,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.clearUsageLog(
          RequestContext.instance(req),
          getTargetUserId(req),

        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserActivityPaths.LOG_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.listUserActivityLogSince(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.type || 'active',
          req.body.options,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );


    this.router.post(
      UserActivityPaths.REMOVE_ENTRY,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.removeActivityEntry(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.id,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserActivityPaths.DELETE_ALL,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.activityService.deleteAllForUser(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );
  }
}

export default UserActivityRoute;
