import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

import ActivityService from '@/services/activity.service';
import {RequestContext} from '@/base/request_context';
import ChangeLogService from '@/services/change_log.service';
import {SyncType} from '@/db/user_changelog.repo';

class UserActivityRoute implements Routes {
  public router = Router();

  private activityService = new ActivityService();
  private changeLogService = new ChangeLogService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    // - de
    this.router.post(
      '/user/activity/push',
      // Excluded from app-level parsers (see app.ts bigBodyPaths): a client
      // that was offline for a long time can push a large accumulated log, and
      // old clients can't split the payload — a 413 would retry forever.
      express.json({limit: '70mb'}),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/push'>, res) => {
        const results = await this.activityService.saveUserActivityLog(
          RequestContext.instance(req),
          req.body.userId,
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
      '/user/activity/reportClassificationIssue',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/reportClassificationIssue'>, res) => {
        const results = await this.activityService.reportClassificationIssue(RequestContext.instance(req), req.body);
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/activity/getClassificationEvalProgramStatus',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/getClassificationEvalProgramStatus'>, res) => {
        const results = await this.activityService.getClassificationEvalProgramStatus(
          RequestContext.instance(req),
          req.body,
        );
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/activity/uploadImageClassificationSamples',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/uploadImageClassificationSamples'>, res) => {
        const results = await this.activityService.uploadImageClassificationSamples(
          RequestContext.instance(req),
          req.body,
        );
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/user/activity/uploadClassificationDatasetSamples',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/uploadClassificationDatasetSamples'>, res) => {
        const results = await this.activityService.uploadClassificationDatasetSamples(
          RequestContext.instance(req),
          req.body,
        );
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    //     this.router.post(
    //   '/user/activity/push'_ACTIVITY_ENTRIES,
    //   authenticateJWT,
    //   errorHelper(async (req, res) => {
    //     const results = await this.activityService.saveUserActivityLogEntries(
    //       RequestContext.instance(req),
    //       req.body.monitorId,
    //       req.body.entries
    //     );
    //     const result = {
    //       success: true,
    //       results: results,
    //     };
    //     res.json(result);
    //   }),
    // );

    // SCH-OK
    this.router.post(
      '/user/activity/clearUsageLog',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/clearUsageLog'>, res) => {
        const results = await this.activityService.clearUsageLog(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/activity/invalidateMonitors',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/invalidateMonitors'>, res) => {
        const results = await this.activityService.invalidateActivityMonitors(
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
      '/user/activity/fixClassification',
      authenticateJWT,
      errorHelper(async (req: ApiReq<any>, res) => {
        const results = await this.activityService.fixActivityLogClassification(RequestContext.instance(req), req.body);
        res.json({
          success: true,
          results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/activity/logList',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/logList'>, res) => {
        const results = await this.activityService.listUserActivityLogSince(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.type || 'default',
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
      '/activity/updateItemVisitHistory',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/activity/updateItemVisitHistory'>, res) => {
        const ctx = RequestContext.instance(req);

        await this.activityService.updateVisitHistoryForItems_deprecate(ctx, req.body.updateList);

        let itemIds = req.body.updateList.map((item) => item.id);
        // Pass the type explicitly. `null` does NOT fall back to the parameter default -- a default
        // only applies to `undefined` -- so this used to write `{type: null, items: [...]}`, which
        // sync.service.ts treats as a corrupt row and answers with a FULL library reset. With
        // `strict: false` in this package, `strictNullChecks` is off and nothing flagged it.
        await this.changeLogService.logItemChangeForUserIds(
          [ctx.currentUserId],
          itemIds,
          SyncType.itemUpdate,
        );

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // TODO: Deprecate this endpoint
    this.router.post(
      '/user/activity/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/list'>, res) => {
        const results = await this.activityService.listUserActivity_deprecating(
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

    this.router.post(
      '/user/activity/removeEntry',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/removeEntry'>, res) => {
        const results = await this.activityService.removeActivityEntry_deprecating(
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
      '/user/activity/deleteAll',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/activity/deleteAll'>, res) => {
        const results = await this.activityService.deleteAllForUser_deprecating(
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
  }
}

export default UserActivityRoute;
