import {RequestContext} from '@/base/request_context';
import CommentService from '@/services/comment.service';
import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import FeedbackService from '@/services/feedback.service';
import * as CommentPaths from 'tset-sharedlib/api/CommentPaths';

class CommentRoute implements Routes {
  public router = Router();

  private commentService = new CommentService();

  private feedbackService = new FeedbackService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {


    // SCH-OK
    this.router.post(
      CommentPaths.REACTION_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.feedbackService.listReactionsForRef(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType
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
      CommentPaths.REACTION_SAVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.feedbackService.saveReaction(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType,
          req.body.reaction
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
      CommentPaths.COMMENT_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.commentService.listForRef(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.refId,
          req.body.refType,
           req.body.pageInfo || {},
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
      CommentPaths.COMMENT_DELETE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.commentService.removeById(
          RequestContext.instance(req),

          req.body.commentId,
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
      CommentPaths.COMMENT_CREATE,

      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.commentService.create(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType,
          req.body.parentId,
          req.body.data,
          req.body.encInfo
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

export default CommentRoute;
