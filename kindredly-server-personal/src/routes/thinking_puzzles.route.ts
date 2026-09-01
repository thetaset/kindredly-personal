import {ApiReq} from '@/types/api-types';
import {thinkingPuzzlesService} from '@/services/thinking_puzzles.service';
import {authenticateOptionalJWT, errorHelper} from '@/utils/auth_utils';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

/**
 * Public read for the Thinking Puzzles content store.
 *
 * Auth-optional on purpose: the app is registered with `requiresLogin: false`, so a guest has to
 * be able to fetch the catalog. Nothing here is per-user — the response is identical for everyone,
 * which is what makes the shared in-process cache in the service safe.
 *
 * The admin write routes live in `_internal/admin.route.ts` with every other `/admin/*` route, so
 * they are excluded from the personal-server build along with the rest of the admin console.
 */
class ThinkingPuzzlesRoute implements Routes {
  public router = Router();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/thinkingPuzzles/catalog',
      authenticateOptionalJWT,
      errorHelper(async (_req: ApiReq<'/thinkingPuzzles/catalog'>, res) => {
        // Live records only. Drafts are filtered in the query, so unreleased content never leaves
        // the server even by accident.
        const results = await thinkingPuzzlesService.getCatalog();
        res.json({success: true, results});
      }),
    );
  }
}

export default ThinkingPuzzlesRoute;
