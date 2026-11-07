import {Router} from 'express';

import {RequestContext} from '@/base/request_context';
import {BoxAdminService} from '@/services/box_admin.service';
import {ApiReq} from '@/types/api-types';
import {Routes} from '@interfaces/routes.interface';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';

/**
 * What the person who set up a self-hosted server can do (HAT-1022): see the families on it, give
 * a new family a sign-up link, and give someone a password reset link. The service refuses all of
 * it on Kindredly's own servers and for anyone but that person.
 *
 * In `routes/`, not `routes/_internal/`: the published Personal repo excludes `_internal`
 * (`scripts/personal-sync/server-src.exclude`), and this exists only for that repo's servers.
 */
class BoxAdminRoute implements Routes {
  public router = Router();
  private box = BoxAdminService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/box/admin/status',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/box/admin/status'>, res) => {
        res.json({success: true, results: await this.box.status(RequestContext.instance(req))});
      }),
    );

    this.router.post(
      '/box/admin/signupLink',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/box/admin/signupLink'>, res) => {
        res.json({success: true, results: await this.box.createSignupCode(RequestContext.instance(req))});
      }),
    );

    this.router.post(
      '/box/admin/resetLink',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/box/admin/resetLink'>, res) => {
        const userId = String(req.body?.userId ?? '');
        res.json({success: true, results: await this.box.createResetCode(RequestContext.instance(req), userId)});
      }),
    );
  }
}

export default BoxAdminRoute;
