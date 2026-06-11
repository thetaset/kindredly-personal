import {RequestContext} from '@/base/request_context';
import CommentService from '@/services/comment.service';
import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import FeedbackService from '@/services/feedback.service';

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
      '/reaction/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/reaction/list'>, res) => {
        const results = await this.feedbackService.listReactionsForRef(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType as any,
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
      '/reaction/save',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/reaction/save'>, res) => {
        const results = await this.feedbackService.saveReaction(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType as any,
          req.body.reaction,
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
      '/post/readReceipt/mark',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/readReceipt/mark'>, res) => {
        const results = await this.feedbackService.markPostReadReceipt(
          RequestContext.instance(req),
          req.body.postId,
          req.body.isRead,
        );
        res.json({
          success: true,
          results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/post/readReceipt/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/readReceipt/list'>, res) => {
        const results = await this.feedbackService.listPostReadReceipts(RequestContext.instance(req), req.body.postId);
        res.json({
          success: true,
          results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/comment/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/comment/list'>, res) => {
        const results = await this.commentService.listForRef(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.refId,
          req.body.refType as any,
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
      '/comment/delete',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/comment/delete'>, res) => {
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
      '/comment/create',

      authenticateJWT,
      errorHelper(async (req: ApiReq<'/comment/create'>, res) => {
        const results = await this.commentService.create(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType as any,
          req.body.parentId,
          req.body.data,
          req.body.encInfo,
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
