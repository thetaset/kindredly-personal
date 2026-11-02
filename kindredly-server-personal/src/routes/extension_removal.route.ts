import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {ExtensionRemovalService} from '@/services/extension_removal.service';
import {removedPageHtml} from '@/services/extensionRemovalPolicy';

/**
 * The removal alert for the Kindredly browser extension (HAT-129). See
 * `extensionRemovalPolicy.ts` for how the link works.
 */
class ExtensionRemovalRoute implements Routes {
  public router = Router();
  private readonly service = ExtensionRemovalService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // The extension asks for its link when someone signs in. Only a child gets one;
    // the link names this install by the client id every request already carries.
    this.router.post(
      '/extension/removalAlert/register',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/extension/removalAlert/register'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.getSessionUserId();
        const user = userId ? await ctx.getUserById(userId) : null;
        const link = user ? this.service.linkFor(user, ctx.getClientId()) : null;
        res.json({success: true, results: {link}});
      }),
    );

    // Opened by the browser itself as the extension is removed, with no session.
    // The page reads the same whatever the link, so it tells a prober nothing.
    this.router.get(
      '/extension/removed',
      errorHelper(async (req, res) => {
        let told = false;
        try {
          told = await this.service.reportRemoved(
            {u: req.query.u, c: req.query.c, s: req.query.s},
            req.get('user-agent'),
          );
        } catch (e) {
          console.error('Extension removal alert failed:', e);
        }
        res.set('Cache-Control', 'no-store');
        res.type('html').send(removedPageHtml(told));
      }),
    );
  }
}

export default ExtensionRemovalRoute;
