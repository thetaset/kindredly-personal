import {Router} from 'express';
import {Routes} from '@interfaces/routes.interface';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {ApiReq} from '@/types/api-types';
import DeviceUnlockService from '@/services/device_unlock.service';

/** The session a request came from, when the sign-in token names one. */
const sessionIdOf = (req: any): string | null => req?.authInfo?.sessionId || null;

/**
 * Approving a new device from one already signed in (UNL-14). Every route is the signed-in person's
 * own: the service checks that a request is theirs before anything is read or changed.
 */
class DeviceUnlockRoute implements Routes {
  public router = Router();
  private service = DeviceUnlockService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/deviceUnlock/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/create'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.service.create(
          ctx.accountId,
          ctx.getCurrentUserId(),
          sessionIdOf(req),
          req.body?.publicKey,
          req.body?.deviceLabel,
        );
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/deviceUnlock/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/list'>, res) => {
        const ctx = RequestContext.instance(req);
        res.json({success: true, results: await this.service.list(ctx.getCurrentUserId(), sessionIdOf(req))});
      }),
    );
    this.router.post(
      '/deviceUnlock/approve',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/approve'>, res) => {
        const ctx = RequestContext.instance(req);
        const approved = await this.service.approve(
          ctx.getCurrentUserId(),
          sessionIdOf(req),
          req.body?.requestId,
          req.body?.wrappedKey,
        );
        res.json({success: true, results: {approved}});
      }),
    );
    this.router.post(
      '/deviceUnlock/deny',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/deny'>, res) => {
        const ctx = RequestContext.instance(req);
        const denied = await this.service.deny(ctx.getCurrentUserId(), req.body?.requestId);
        res.json({success: true, results: {denied}});
      }),
    );
    this.router.post(
      '/deviceUnlock/take',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/take'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.service.take(ctx.getCurrentUserId(), req.body?.requestId, req.body?.pickupToken);
        res.json({success: true, results});
      }),
    );
    this.router.post(
      '/deviceUnlock/cancel',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/deviceUnlock/cancel'>, res) => {
        const ctx = RequestContext.instance(req);
        const cancelled = await this.service.cancel(ctx.getCurrentUserId(), req.body?.requestId, req.body?.pickupToken);
        res.json({success: true, results: {cancelled}});
      }),
    );
  }
}

export default DeviceUnlockRoute;
