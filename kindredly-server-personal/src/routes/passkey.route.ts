import {Router} from 'express';
import {Routes} from '@interfaces/routes.interface';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import {logger} from '@/utils/logger';
import {container} from '@/inversify.config';
import PasskeyService from '@/services/passkey.service';
import {ApiReq} from '@/types/api-types';
import {RequestContext} from '@/base/request_context';

class PasskeyRoute implements Routes {
  public router = Router();
  private passkeyService = container.resolve(PasskeyService);

  constructor() {
    logger.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Generate a challenge for passkey registration or authentication
    this.router.post(
      '/auth/passkey/challenge',
      errorHelper(async (req: ApiReq<'/auth/passkey/challenge'>, res) => {
        const {userId, type, usernameOrEmail, operation} = req.body;

        // For registration, require authentication
        // For authentication, userId is optional (discovered from credential)
        let targetUserId = userId;
        if (type === 'register') {
          // Verify JWT for registration
          // This will be handled by the route that calls this with auth
        }

        const challenge = await this.passkeyService.generateChallenge(
          targetUserId,
          type || 'register',
          usernameOrEmail,
          operation,
        );

        res.json({
          success: true,
          results: challenge,
        });
      }),
    );

    // Generate challenge with authentication (for registration)
    this.router.post(
      '/auth/passkey/challenge/auth',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/passkey/challenge'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = getTargetUserId(req) || ctx.userId;
        // A caller may only act on themselves (or an admin over the target in
        // their account) — body userId must not override the authed user.
        await ctx.verifySelfOrAdminOverUser(userId);
        const {type, operation} = req.body;

        const challenge = await this.passkeyService.generateChallenge(userId, type || 'register', undefined, operation);

        res.json({
          success: true,
          results: challenge,
        });
      }),
    );

    // Register a new passkey
    this.router.post(
      '/auth/passkey/register',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/passkey/register'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = getTargetUserId(req) || ctx.userId;
        // Prevent passkey-based account takeover: a caller cannot register a
        // credential onto another user's account via a body userId.
        await ctx.verifySelfOrAdminOverUser(userId);
        const accountId = ctx.accountId;

        const result = await this.passkeyService.registerPasskey(userId, accountId, req.body);

        res.json({
          success: result.success,
          results: result,
        });
      }),
    );

    // Authenticate with a passkey
    this.router.post(
      '/auth/passkey/authenticate',
      errorHelper(async (req: ApiReq<'/auth/passkey/authenticate'>, res) => {
        const result = await this.passkeyService.authenticatePasskey(req.body);

        res.json({
          success: result.success,
          results: result,
        });
      }),
    );

    // Login with a passkey (returns full auth response with token)
    this.router.post(
      '/auth/passkey/login',
      errorHelper(async (req: ApiReq<'/auth/passkey/login'>, res) => {
        const authResponse = await this.passkeyService.loginWithPasskey(req.body);

        res.json(authResponse);
      }),
    );

    // List passkeys for a user
    this.router.get(
      '/auth/passkey/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/passkey/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = getTargetUserId(req) || ctx.userId;
        await ctx.verifySelfOrAdminOverUser(userId);

        const credentials = await this.passkeyService.listPasskeys(userId);

        res.json({
          success: true,
          results: {credentials},
        });
      }),
    );

    // Also support POST for list (for typed API compatibility)
    this.router.post(
      '/auth/passkey/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/passkey/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = req.body.userId || ctx.userId;
        await ctx.verifySelfOrAdminOverUser(userId);

        const credentials = await this.passkeyService.listPasskeys(userId);

        res.json({
          success: true,
          results: {credentials},
        });
      }),
    );

    // Delete a passkey
    this.router.post(
      '/auth/passkey/delete',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/passkey/delete'>, res) => {
        const ctx = RequestContext.instance(req);
        const userId = ctx.userId;
        const {credentialId} = req.body;

        const success = await this.passkeyService.deletePasskey(userId, credentialId);

        res.json({
          success,
          results: {success},
        });
      }),
    );
  }
}

export default PasskeyRoute;
