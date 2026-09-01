import {RequestContext} from '@/base/request_context';
import SetupCatalogService from '@/services/setup_catalog.service';
import {ApiReq} from '@/types/api-types';
import {authenticateOptionalJWT, errorHelper} from '@/utils/auth_utils';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

class SetupCatalogRoute implements Routes {
  public router = Router();

  private setupCatalogService = new SetupCatalogService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/setup/catalog/get',
      authenticateOptionalJWT,
      errorHelper(async (req: ApiReq<'/setup/catalog/get'>, res) => {
        const result = await this.setupCatalogService.getCatalog(RequestContext.instance(req));
        res.json({success: true, results: result});
      }),
    );
  }
}

export default SetupCatalogRoute;
