import { RequestContext } from '@/base/request_context';
import PostService from '@/services/post.service';
import { Routes } from '@interfaces/routes.interface';
import express, { Router } from 'express';
import { authenticateJWT, errorHelper, getTargetUserId } from '../utils/auth_utils';
import * as PostPaths from 'tset-sharedlib/api/PostPaths';

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
      PostPaths.POST_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      PostPaths.POST_CREATE,
      express.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000,
      }),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.postService.createPost(
          RequestContext.instance(req),
          req.body.postType,
          req.body.data,
          req.body.attachedItems,
          req.body.sharedWith,
          req.body.encInfo
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
      PostPaths.POST_UPDATE_SHARED_WITH,
      authenticateJWT,
      errorHelper(async (req, res) => {
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

    // SCH-OK
    this.router.post(
      PostPaths.POST_DELETE,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
