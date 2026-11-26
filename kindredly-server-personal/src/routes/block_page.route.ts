import {ApiReq} from '@/types/api-types';
import {blockPageDefaultsService} from '@/services/block_page_defaults.service';
import {authenticateOptionalJWT, errorHelper} from '@/utils/auth_utils';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

/**
 * Public read of Kindredly's default collections for Block page customization (HAT-1268).
 *
 * Auth-optional: a block page can show before anyone signs in, and the answer is the same for
 * everyone, which is what makes the service's shared cache safe. The admin writes live in
 * `_internal/admin.route.ts` with every other `/admin/*` route.
 */
class BlockPageRoute implements Routes {
  public router = Router();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/blockPage/defaults',
      authenticateOptionalJWT,
      errorHelper(async (_req: ApiReq<'/blockPage/defaults'>, res) => {
        const results = await blockPageDefaultsService.getForDevices();
        res.json({success: true, results});
      }),
    );
  }
}

export default BlockPageRoute;
