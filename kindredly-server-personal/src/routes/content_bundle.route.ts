import {RequestContext} from '@/base/request_context';
import ContentBundleService from '@/services/content_bundle.service';
import {ApiReq} from '@/types/api-types';
import {authenticateOptionalJWT, errorHelper} from '@/utils/auth_utils';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

class ContentBundleRoute implements Routes {
  public router = Router();

  private bundleService = new ContentBundleService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/content/bundle/recommend',
      authenticateOptionalJWT,
      errorHelper(async (req: ApiReq<'/content/bundle/recommend'>, res) => {
        const result = await this.bundleService.recommend(RequestContext.instance(req), req.body || {});
        res.json({success: true, results: result});
      }),
    );
  }
}

export default ContentBundleRoute;
