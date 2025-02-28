import {RequestContext} from '@/base/request_context';
import UserFeedService from '@/services/user_feed.service';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import * as UserFeedPaths from 'tset-sharedlib/api/UserFeedPaths';

class UserFeedRoute implements Routes {
  public router = Router();

  private feedService = new UserFeedService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      UserFeedPaths.FEED_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.feedService.listByUserId(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.pageInfo,
          req.body.includeComments,
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
      UserFeedPaths.GET_BY_POST_ID,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.feedService.getByPostId(
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
      UserFeedPaths.REMOVE_BY_ID,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserFeedPaths.REMOVE_POST,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserFeedPaths.UPDATE_READ_STATUS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserFeedPaths.UPDATE_READ_STATUS_MULTIPLE,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
