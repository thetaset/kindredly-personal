import {RequestContext} from '@/base/request_context';
import PostService from '@/services/post.service';
import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

class PostRoute implements Routes {
  public router = Router();

  private postService = new PostService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/post/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/list'>, res) => {
        const results = await this.postService.listByUserId(
          RequestContext.instance(req),
          getTargetUserId(req),
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
      '/post/create',
      express.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/create'>, res) => {
        const results = await this.postService.createPost(RequestContext.instance(req), req.body);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/post/updateSharedWith',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/updateSharedWith'>, res) => {
        const results = await this.postService.updateSharedWith(
          RequestContext.instance(req),
          req.body.postId,
          req.body.sharedWith,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/post/attachment/saveToLibrary',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/attachment/saveToLibrary'>, res) => {
        const results = await this.postService.saveAttachmentToLibrary(RequestContext.instance(req), req.body);
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/post/delete',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/post/delete'>, res) => {
        const results = await this.postService.deletePost(RequestContext.instance(req), req.body.postId);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );
  }
}

export default PostRoute;
