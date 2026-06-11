import {RequestContext} from '@/base/request_context';
import UserFeedService from '@/services/user_feed.service';
import {SharedFeedbackFeedService} from '@/services/shared_feedback_feed.service';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

class UserFeedRoute implements Routes {
  public router = Router();

  private feedService = new UserFeedService();
  private sharedFeedbackFeedService = new SharedFeedbackFeedService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/feed/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/list'>, res) => {
        const results = await this.feedService.listByUserId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.pageInfo,
          req.body.includeComments,
          true,
          req.body.newOnly,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/feed/searchPosts',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/searchPosts'>, res) => {
        const results = await this.feedService.searchPostsByUserId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body,
        );
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/feed/sharedFeedback/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/sharedFeedback/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = getTargetUserId(req);

        const results = await this.sharedFeedbackFeedService.list(ctx, userId, req.body);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/feed/sharedFeedback/markSeen',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/sharedFeedback/markSeen'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = getTargetUserId(req);

        const results = await this.sharedFeedbackFeedService.markSeen(ctx, userId, req.body);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/feed/getByPostId',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/getByPostId'>, res) => {
        const results = await this.feedService.getByPostId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.postId,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/feed/removeById',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/removeById'>, res) => {
        const results = await this.feedService.removeById(RequestContext.instance(req), req.body.feedId);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/feed/removePost',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/removePost'>, res) => {
        const results = await this.feedService.removeByPostId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.postId,
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
      '/feed/updateReadStatus',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/updateReadStatus'>, res) => {
        const results = await this.feedService.updateReadStatus(
          RequestContext.instance(req),
          req.body.postId,
          req.body.isRead,
          req.body.commentIds || [],
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
      '/feed/updateReadStatusForMultipleEntries',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/feed/updateReadStatusForMultipleEntries'>, res) => {
        const results = await this.feedService.updateReadStatusForMultipleEntries(
          RequestContext.instance(req),
          req.body.ids,
          req.body.isRead,
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

export default UserFeedRoute;
