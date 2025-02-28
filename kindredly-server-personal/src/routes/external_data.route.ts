import ExternalDataService from '@/services/external_data.service';
import { Routes } from '@interfaces/routes.interface';
import { Router } from 'express';
import { authenticateJWT, errorHelper } from '../utils/auth_utils';
import * as ExternalDataPaths from 'tset-sharedlib/api/ExternalDataPaths';

class ExternalDataRoute implements Routes {
  public router = Router();

  private externalDataService = new ExternalDataService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      ExternalDataPaths.FETCH_META,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const url = req.body.url;
        const results = await this.externalDataService.fetchMetadataTaskRunner(url);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    this.router.get(
      ExternalDataPaths.USERDATA_PROXY,
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        const url = req.query.url;

        const type = req.query.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }),
    );

    this.router.post(
      ExternalDataPaths.USERDATA_PROXYR,
      authenticateJWT,
      errorHelper(async (req, res, next) => {
        const url = req.body.url;

        const type = req.body.type || 'image';

        await this.externalDataService.fetchAndStreamData(url, res, type);
      }
      )
    );
  }
}

export default ExternalDataRoute;
