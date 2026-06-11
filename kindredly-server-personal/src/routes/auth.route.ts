import {config} from '@/config';
import {HttpException} from '@/exceptions/HttpException';
import AuthService from '@/services/auth.service';
import {SessionService} from '@/services/session.service';
import {RequestContext} from '@/base/request_context';
import {CreateUserDto} from '@dtos/users.dto';
import {Routes} from '@interfaces/routes.interface';
import validationMiddleware from '@middlewares/validation.middleware';
import {isEmpty} from 'class-validator';
import {NextFunction, Request, Response, Router} from 'express';
import jsonwebtoken from 'jsonwebtoken';
import crypto from 'crypto';
import {
  authenticateJWT,
  errorHelper,
  getTargetUserId,
  removeSensitiveInfoFromUser,
} from '../utils/auth_utils';

import {logger} from '@/utils/logger';
import {body} from 'express-validator';
import {container} from '@/inversify.config';
import {ApiReq} from '@/types/api-types';
import {AuthResponse} from 'tset-sharedlib/api';

class AuthRoute implements Routes {
  public router = Router();

  private authService = container.resolve(AuthService);

  constructor() {
    logger.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/auth/register',
      validationMiddleware(CreateUserDto, 'body'),
      errorHelper(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userData: CreateUserDto = req.body;

        const authInfo = await this.authService.registerAndSignin(userData, req);

        const {findUser, tokenData, passwordForClient, recoveryKeyForClient} = authInfo;


        let response: AuthResponse = {
          tokenData,
          passwordForClient,
          recoveryKeyForClient,
          user: removeSensitiveInfoFromUser(findUser),
          success: true,
          message: 'register',
          statusCode: 200,
        };

        res.status(200).json(response);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/signin',
      validationMiddleware(CreateUserDto, 'body'),
      errorHelper(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userData: CreateUserDto = req.body;
        const {findUser, tokenData, passwordForClient, recoveryKeyForClient} = await this.authService.signin(
          userData,
          req,
        );


        let response: AuthResponse = {
          tokenData,
          passwordForClient,
          recoveryKeyForClient,
          user: removeSensitiveInfoFromUser(findUser),
          success: true,
          message: 'login',
          statusCode: 200,
        };

        res.status(200).json(response);
      }),
    );

    this.router.post(
      '/auth/recoverAccountAccess',
      errorHelper(async (req: ApiReq<'/auth/recoverAccountAccess'>, res) => {
        const {findUser, tokenData, passwordForClient, recoveryKeyForClient} =
          await this.authService.recoverAccountAccess(
            req.body.verificationCode,
            (req.body.clientInfoData as any) || {},
            req,
          );


        const response: AuthResponse = {
          tokenData,
          passwordForClient,
          recoveryKeyForClient,
          user: removeSensitiveInfoFromUser(findUser),
          success: true,
          message: 'recovery-login',
          statusCode: 200,
        };

        res.status(200).json(response);
      }),
    );

    this.router.post(
      '/auth/desktopCompanionAuthorize',
      errorHelper(async (req: Request, res: Response): Promise<void> => {
        const usernameOrEmail = String(req.body?.usernameOrEmail || '').trim();
        const pinpass = String(req.body?.pinpass || '');

        const user = await this.authService.verifyDesktopCompanionAdmin(usernameOrEmail, pinpass);

        res.status(200).json({
          success: true,
          results: {
            user: removeSensitiveInfoFromUser(user),
          },
        });
      }),
    );

    // SCH-OK
    this.router.all(
      '/auth/signout',
      authenticateJWT,
      errorHelper(async (req: Request, res: Response): Promise<void> => {
        await this.authService.invalidateSession(RequestContext.instance(req));

        res.status(200).json({
          success: true,
          message: 'signed out',
        });
      }),
    );

    // SCH-OK
    // One-time short-lived ticket for SSE (EventSource can't send headers;
    // tickets keep long-lived JWTs out of URLs and logs).
    this.router.post(
      '/auth/sseTicket',
      authenticateJWT,
      errorHelper(async (req: Request, res: Response): Promise<void> => {
        const ticket = await SessionService.instance.createSseTicket((req as any).authInfo);
        res.status(200).json({
          success: true,
          results: {ticket, expiresInSec: 60},
        });
      }),
    );

    // SCH-OK
    // Revokes all sessions for a user ("sign out everywhere"). Acting on
    // yourself spares the current session; a parent/admin acting on another
    // user revokes all of theirs.
    this.router.post(
      '/auth/signoutEverywhere',
      authenticateJWT,
      errorHelper(async (req: Request, res: Response): Promise<void> => {
        const ctx = RequestContext.instance(req);
        const targetUserId = (req.body && req.body.userId) || ctx.authUserId;
        const revokedCount = await this.authService.signoutEverywhere(ctx, targetUserId);

        res.status(200).json({
          success: true,
          results: {revokedCount},
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/switchUser',
      authenticateJWT,
      body('userId').notEmpty().isString().withMessage('userId is invalid'),
      errorHelper(async (req: ApiReq<'/auth/switchUser'>, res) => {
        const {userId, pinpass, clientInfo} = req.body;

        const {findUser, tokenData, passwordForClient, recoveryKeyForClient} = await this.authService.switchUser(
          RequestContext.instance(req),
          userId,
          pinpass,
          (clientInfo as any) || {},
        );


        let results: AuthResponse = {
          tokenData,
          user: removeSensitiveInfoFromUser(findUser),
          passwordForClient,
          recoveryKeyForClient,
          success: true,

          statusCode: 200,
        };

        res.status(200).json({
          results: results,
          success: true,
          message: 'user switched',
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/permissionOverride',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/permissionOverride'>, res) => {
        const {overrideUserId, pinpass} = req.body;
        if (isEmpty(overrideUserId)) throw new HttpException(400, 'overrideUserId is empty');

        const {overrideUserId: verifiedOverrideUserId, tokenData} = await this.authService.verifyUserPinPass(
          RequestContext.instance(req),
          overrideUserId,
          pinpass,
        );

        const result = {
          success: true,
          results: {tokenData, overrideUserId: verifiedOverrideUserId, success: true},
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/auth/desktopHandoff/create',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/desktopHandoff/create'>, res) => {
        const results = await this.authService.createDesktopHandoffToken(RequestContext.instance(req));

        res.json({
          success: true,
          results,
        });
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/updatePassword',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/updatePassword'>, res) => {
        const results = await this.authService.updatePassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password,
          req.body.passwordCopy,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/checkPassword',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/checkPassword'>, res) => {
        const results = await this.authService.checkPassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password,
        );

        const result = {
          success: true,
          results: {valid: results},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/saveRecoveryKeyOnServer',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/saveRecoveryKeyOnServer'>, res) => {
        const results = await this.authService.saveRecoveryKeyOnServer(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.recoveryKey,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/removeRecoveryKeyFromServer',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/removeRecoveryKeyFromServer'>, res) => {
        const results = await this.authService.removeRecoveryKeyFromServer(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/forceResetPassword',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/forceResetPassword'>, res) => {
        const results = await this.authService.forceResetPassword(RequestContext.instance(req), getTargetUserId(req));

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/updatePIN',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/auth/updatePIN'>, res) => {
        const results = await this.authService.updatePIN(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.pin,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/createUser',
      authenticateJWT,
      validationMiddleware(CreateUserDto, 'body'),
      errorHelper(async (req: ApiReq<'/auth/createUser'>, res) => {
        const userData = req.body as any;

        const user = await this.authService.createAccountUser(RequestContext.instance(req), userData);
        const result = {
          success: true,
          results: user,
        };
        res.json(result);
      }),
    );

    // _generateUniqueUsername
    this.router.post(
      '/auth/genUniqueUsername',
      authenticateJWT,
      validationMiddleware(CreateUserDto, 'body'),
      errorHelper(async (req: ApiReq<'/auth/genUniqueUsername'>, res) => {
        const user = await this.authService.generateUniqueUsername(RequestContext.instance(req));
        const result = {
          success: true,
          results: user,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/resetPasswordRequest',
      errorHelper(async (req: ApiReq<'/auth/resetPasswordRequest'>, res) => {
        const email = String((req.body as any)?.email || (req.body as any)?.uEmail || '').trim();
        const result = await this.authService.resetPasswordRequest(email);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/recoverPassword',
      errorHelper(async (req: ApiReq<'/auth/recoverPassword'>, res) => {
        const result = await this.authService.recoverPassword(req.body.verificationCode);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      '/auth/resetPassword',
      errorHelper(async (req: ApiReq<'/auth/resetPassword'>, res) => {
        const result = await this.authService.resetPassword(req.body.verificationCode, req.body.password);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    // - verifies token and gets user login info
    this.router.post(
      '/auth/tokenLogin',
      errorHelper(async (req: ApiReq<'/auth/tokenLogin'>, res) => {
        const token = req.body.token;
        jsonwebtoken.verify(token, config.jwtAccessTokenSecret, (err, authInfo) => {
          if (err || !authInfo || typeof authInfo === 'string' || !authInfo.userId) {
            try {
              const jwtFp = crypto
                .createHash('sha256')
                .update(String(config.jwtAccessTokenSecret || ''))
                .digest('hex')
                .slice(0, 10);
              console.error('[auth/tokenLogin] JWT verify failed', {
                name: (err as any)?.name,
                message: (err as any)?.message,
                jwtFp,
              });
            } catch {
              console.error('[auth/tokenLogin] JWT verify failed', err);
            }
            return res.sendStatus(403);
          }
          (async () => {
            try {
              // A revoked token must not be exchangeable for fresh credentials.
              const sessionCheck = await SessionService.instance.verifyAuthInfoSession(authInfo as any, {
                context: '/auth/tokenLogin',
              });
              if (!sessionCheck.ok) {
                return res.sendStatus(403);
              }

              const {findUser, tokenData, passwordForClient, recoveryKeyForClient} =
                await this.authService.getTokenLoginUser(authInfo.userId as string, req.body.clientInfoData, req);

              let response: AuthResponse = {
                tokenData,
                user: removeSensitiveInfoFromUser(findUser),
                passwordForClient,
                recoveryKeyForClient,
                success: true,
              };
              res.json({
                results: response,
                success: true,
              });
            } catch (e) {
              console.error('[auth/tokenLogin] getTokenLoginUser failed', e);
              return res.sendStatus(403);
            }
          })();
        });
      }),
    );
  }
}

export default AuthRoute;
