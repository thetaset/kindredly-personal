import { config } from "@/config";
import { HttpException } from "@/exceptions/HttpException";
import AuthService from "@/services/auth.service";
import { RequestContext } from "@/base/request_context";
import { CreateUserDto } from "@dtos/users.dto";
import { Routes } from "@interfaces/routes.interface";
import validationMiddleware from "@middlewares/validation.middleware";
import { isEmpty } from "class-validator";
import { NextFunction, Request, Response, Router } from "express";
import jsonwebtoken from "jsonwebtoken";
import {
  authenticateJWT,
  clearAuthCookie,
  errorHelper,
  getTargetUserId,
  removeSensitiveInfoFromUser,
  setAuthCookie,
} from "../utils/auth_utils";

import { logger } from "@/utils/logger";
import { body } from "express-validator";
import { container } from '@/inversify.config';
import * as AuthApiPaths from "tset-sharedlib/api/AuthApiPaths";

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
      AuthApiPaths.AUTH_REGISTER,
      validationMiddleware(CreateUserDto, "body"),
      errorHelper(
        async (
          req: Request,
          res: Response,
          next: NextFunction
        ): Promise<void> => {
          const userData: CreateUserDto = req.body;

          const authInfo = await this.authService.registerAndSignin(
            userData,
            req
          );

          const {
            findUser,
            tokenData,
            passwordForClient,
            recoveryKeyForClient,
          } = authInfo;

          setAuthCookie(req, res, tokenData.token);

          res.status(200).json({
            tokenData,
            passwordForClient,
            recoveryKeyForClient,
            user: removeSensitiveInfoFromUser(findUser),
            success: true,
            message: "register",
          });
        }
      )
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_SIGNIN,
      validationMiddleware(CreateUserDto, "body"),
      errorHelper(
        async (
          req: Request,
          res: Response,
          next: NextFunction
        ): Promise<void> => {
          const userData: CreateUserDto = req.body;
          const {
            findUser,
            tokenData,
            passwordForClient,
            recoveryKeyForClient,
          } = await this.authService.signin(userData, req);

          setAuthCookie(req, res, tokenData.token);

          res.status(200).json({
            tokenData,
            passwordForClient,
            recoveryKeyForClient,
            user: removeSensitiveInfoFromUser(findUser),
            success: true,
            message: "login",
          });
        }
      )
    );

    // SCH-OK
    this.router.all(
      AuthApiPaths.AUTH_SIGNOUT,
      authenticateJWT,
      errorHelper(
        async (
          req: Request,
          res: Response): Promise<void> => {
          clearAuthCookie(req, res);
          await this.authService.invalidateSession(RequestContext.instance(req));

          res.status(200).json({
            success: true,
            message: "signed out",
          });
        }
      )
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_SWITCH_USER,
      authenticateJWT,
      body('userId').notEmpty().isString().withMessage('userId is invalid'),
      errorHelper(async (req, res) => {
        const { userId, pinpass, clientInfo } = req.body;

        const {
          findUser,
          tokenData,
          passwordForClient,
          recoveryKeyForClient,
        } = await this.authService.switchUser(
          RequestContext.instance(req),
          userId,
          pinpass,
          clientInfo || {}
        );

        setAuthCookie(req, res, tokenData.token);

        res.status(200).json({
          results: {
            tokenData,
            user: removeSensitiveInfoFromUser(findUser),
            passwordForClient,
            recoveryKeyForClient,
            success: true,
          },
          success: true,
          message: "user switched",
        });
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_PERMISSION_OVERRIDE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const { userId, pinpass } = req.body;
        if (isEmpty(userId)) throw new HttpException(400, "userId is empty");

        const {
          targetUserId,
          tokenData,
        } = await this.authService.verifyUserPinPass(
          RequestContext.instance(req),
          userId,
          pinpass
        );

        const result = {
          success: true,
          results: { tokenData, targetUserId, success: true },
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_UPDATE_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.updatePassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password,
          req.body.passwordCopy
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_CHECK_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.checkPassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_SET_STORED_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.setStoredPassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password,
          req.body.passwordCopy
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_CLEAR_STORED_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.clearStoredPassword(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.password
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_SAVE_RECOVERY_KEY_ON_SERVER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.saveRecoveryKeyOnServer(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.recoveryKey
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_REMOVE_RECOVERY_KEY_FROM_SERVER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.removeRecoveryKeyFromServer(
          RequestContext.instance(req),
          getTargetUserId(req)
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_FORCE_RESET_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.forceResetPassword(
          RequestContext.instance(req),
          getTargetUserId(req)
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_UPDATE_PIN,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.authService.updatePIN(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.pin
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_CREATE_USER,
      authenticateJWT,
      validationMiddleware(CreateUserDto, "body"),
      errorHelper(async (req, res) => {
        let userData: CreateUserDto = req.body;

        const user = await this.authService.createAccountUser(
          RequestContext.instance(req),
          userData
        );
        const result = {
          success: true,
          results: user,
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_SHOW_STORED_PASSWORD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const result = await this.authService.showStoredPassword(
          RequestContext.instance(req),
          getTargetUserId(req)
        );
        res.json({ success: true, results: result });
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_RESET_PASSWORD_REQUEST,
      errorHelper(async (req, res) => {
        const result = await this.authService.resetPasswordRequest(
          req.body.uEmail
        );
        res.json({ success: true, results: result });
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_RECOVER_PASSWORD,
      errorHelper(async (req, res) => {
        const result = await this.authService.recoverPassword(
          req.body.verificationCode
        );
        res.json({ success: true, results: result });
      })
    );

    // SCH-OK
    this.router.post(
      AuthApiPaths.AUTH_RESET_PASSWORD,
      errorHelper(async (req, res) => {
        const result = await this.authService.resetPassword(
          req.body.verificationCode,
          req.body.password
        );
        res.json({ success: true, results: result });
      })
    );



    // SCH-OK
    // - verifies token and gets user login info
    this.router.post(
      AuthApiPaths.AUTH_TOKEN_LOGIN,
      errorHelper(async (req, res) => {
        const token = req.body.token;
        jsonwebtoken.verify(
          token,
          config.jwtAccessTokenSecret,
          (err, authInfo) => {
            if (err || !authInfo || !authInfo.userId) {
              console.error(err);
              return res.sendStatus(403);
            }
            (async () => {
              try {
                const {
                  findUser,
                  tokenData,
                  passwordForClient,
                  recoveryKeyForClient,
                } = await this.authService.getTokenLoginUser(
                  authInfo.userId,
                  req.body.clientInfoData,
                  req
                );
                setAuthCookie(req, res, token);
                res.json({
                  results: {
                    tokenData,
                    user: removeSensitiveInfoFromUser(findUser),
                    passwordForClient,
                    recoveryKeyForClient,
                    success: true,
                  },
                  success: true,
                });
              } catch (e) {
                console.error(e);
                return res.sendStatus(403);
              }
            })();
          }
        );
      })
    );
  }
}

export default AuthRoute;
