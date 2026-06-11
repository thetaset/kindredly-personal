import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, authenticateOptionalJWT, errorHelper} from '../utils/auth_utils';

import {RequestContext} from '@/base/request_context';
import UserService from '@/services/user.service';

class UserShowcaseRoute implements Routes {
  public router = Router();

  private userService = new UserService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/user/showcase/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/showcase/get'>, res) => {
        const resultData = await this.userService.getMyShowcase(RequestContext.instance(req));
        res.json({success: true, results: resultData});
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/showcase/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/showcase/update'>, res) => {
        await this.userService.updateMyShowcase(RequestContext.instance(req), {
          entries: req.body.entries,
          publishIds: req.body.publishIds,
          config: req.body.config,
          publicEnabled: req.body.publicEnabled,
        });
        res.json({success: true, results: {}});
      }),
    );

    // SCH-OK
    // Auth not required (but optional, for friends/family visibility downstream)
    this.router.post(
      '/user/showcase/getByPublicId',
      authenticateOptionalJWT,
      errorHelper(async (req: ApiReq<'/user/showcase/getByPublicId'>, res) => {
        const resultData = await this.userService.getShowcaseByPublicId(
          RequestContext.instance(req),
          req.body.publicId,
        );
        res.json({success: true, results: resultData});
      }),
    );

    // SCH-OK
    // Auth required: used for in-app friend/family profile views.
    this.router.post(
      '/user/showcase/getByUserId',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/showcase/getByUserId'>, res) => {
        const resultData = await this.userService.getShowcaseByUserId(RequestContext.instance(req), req.body.userId);
        res.json({success: true, results: resultData});
      }),
    );
  }
}

export default UserShowcaseRoute;
