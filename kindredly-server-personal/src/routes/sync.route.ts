import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

import SyncService from '@/services/sync.service';
import {RequestContext} from '@/base/request_context';
import * as SyncPaths from 'tset-sharedlib/api/SyncPaths';

class SyncRoute implements Routes {
  public router = Router();

  private syncService = new SyncService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  // SCH-OK
  private initializeRoutes() {
    this.router.post(
      [SyncPaths.CHANGELOG_SYNC, SyncPaths.CHANGELOG_GET_ITEM_UPDATES],
      authenticateJWT,
      errorHelper(async (req, res) => {
        const date = req.body.lastUpdate ? new Date(req.body.lastUpdate) : null;
        const results = await this.syncService.runSync(
          RequestContext.instance(req),
          getTargetUserId(req),
          date,
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

export default SyncRoute;
