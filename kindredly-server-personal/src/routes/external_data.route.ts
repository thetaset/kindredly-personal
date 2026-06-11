import ExternalDataService from '@/services/external_data.service';
import ContentLookupService from '@/services/content_lookup.service';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';

class ExternalDataRoute implements Routes {
  public router = Router();

  private externalDataService = new ExternalDataService();
  private contentLookupService = new ContentLookupService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Deprecated compatibility route. Prefer /data/contentInfo with includeMetadata.
    this.router.post(
      '/data/meta',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/data/meta'>, res) => {
        const url = req.body.url;
        const results = await this.externalDataService.fetchMetadataTaskRunner(url);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Deprecated compatibility route. Prefer /data/contentInfo with includeResourceInfo.
    this.router.post(
      '/data/resourceInfo',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/data/resourceInfo'>, res) => {
        const data = req.body;
        const results = await this.externalDataService.getResourceInfo(data);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Deprecated compatibility route. Prefer /data/contentInfo with includeClassification.
    this.router.post(
      '/data/classifyContentType',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/data/classifyContentType'>, res) => {
        const info = req.body.info;
        console.log('Content classification request:', info);
        const results = await this.externalDataService.runContentClassificationTaskRunner(
          RequestContext.instance(req),
          info,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/data/contentInfo',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/data/contentInfo'>, res) => {
        const results = await this.contentLookupService.lookup(RequestContext.instance(req), req.body);
        res.json({
          success: true,
          results,
        });
      }),
    );

    this.router.get(
      '/userdata/proxy',
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        const url = req.query.url;

        const type = req.query.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }),
    );

    this.router.post(
      '/userdata/proxyr',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/userdata/proxyr'>, res, next) => {
        const url = req.body.url;

        const type = req.body.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }),
    );
  }
}

export default ExternalDataRoute;
