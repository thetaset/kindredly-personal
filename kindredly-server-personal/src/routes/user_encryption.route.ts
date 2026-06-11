import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

import KeyEntryService from '@/services/key_entry.service';
import {RequestContext} from '@/base/request_context';

class UserEncryptionRoute implements Routes {
  public router = Router();

  private keyEntryService = new KeyEntryService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/user/encryption/listKeys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/listKeys'>, res) => {
        const keys = await this.keyEntryService.listForUser(RequestContext.instance(req), getTargetUserId(req));

        const result = {
          success: true,
          results: keys,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/encryption/saveUserKeys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/saveUserKeys'>, res) => {
        await this.keyEntryService.saveUserKeys(
          RequestContext.instance(req),
          getTargetUserId(req),

          req.body.keyList,
        );
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/encryption/saveAccountKeys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/saveAccountKeys'>, res) => {
        await this.keyEntryService.saveAccountKeys(RequestContext.instance(req), req.body.keyList);
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/encryption/createKeyEntryForUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/createKeyEntryForUser'>, res) => {
        const id = await this.keyEntryService.createKeyEntryForUser(
          RequestContext.instance(req),
          req.body.targetUserId,
          req.body.keyEntry as any,
        );

        const result = {
          success: true,
          results: {id},
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/encryption/updateSettings',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/encryption/updateSettings'>, res) => {
        await this.keyEntryService.updateUserEncSettings(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.encSettings,
        );
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );
    this.router.post(
      '/user/encryption/removeKeys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/removeKeys'>, res) => {
        await this.keyEntryService.removeUserKeys(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.deleteAccountKeys == true,
        );
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );
    this.router.post(
      '/user/encryption/removeAllAccountKeys',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/removeAllAccountKeys'>, res) => {
        await this.keyEntryService.removeAllAccountKeys(RequestContext.instance(req));
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/encryption/deleteRecoveryKey',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/encryption/deleteRecoveryKey'>, res) => {
        await this.keyEntryService.deleteRecoveryKey(RequestContext.instance(req), getTargetUserId(req));
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );
  }
}

export default UserEncryptionRoute;
