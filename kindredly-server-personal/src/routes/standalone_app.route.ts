import {Router} from 'express';
import {Routes} from '@interfaces/routes.interface';
import {ApiReq} from '@/types/api-types';
import {authenticateOptionalJWT, errorHelper} from '@/utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import StandaloneAppService from '@/services/standalone_app.service';

class StandaloneAppRoute implements Routes {
  public router = Router();

  private standaloneAppService = new StandaloneAppService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/standaloneApp/list',
      authenticateOptionalJWT,
      errorHelper(async (_req, res) => {
        const result = this.standaloneAppService.listApps();
        res.json({success: true, result: {apps: result}});
      }),
    );

    this.router.post(
      '/standaloneApp/bootstrap',
      authenticateOptionalJWT,
      errorHelper(async (req: ApiReq<'/standaloneApp/bootstrap'>, res) => {
        const result = await this.standaloneAppService.getBootstrap(
          RequestContext.instance(req),
          req.body.slug,
          req.body.redirectPath,
        );
        res.json({success: true, result});
      }),
    );
  }
}

export default StandaloneAppRoute;
