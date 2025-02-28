import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';


import KeyEntryService from '@/services/key_entry.service';
import {RequestContext} from '@/base/request_context';
import * as UserEncryptionPaths from 'tset-sharedlib/api/UserEncryptionPaths';

class UserEncryptionRoute implements Routes {
  public router = Router();

  private keyEntryService = new KeyEntryService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.post(
      UserEncryptionPaths.LIST_KEYS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const keys = await this.keyEntryService.listForUser(RequestContext.instance(req), getTargetUserId(req));

        const result = {
          success: true,
          results: keys,
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserEncryptionPaths.SAVE_USER_KEYS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserEncryptionPaths.SAVE_ACCOUNT_KEYS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.keyEntryService.saveAccountKeys(RequestContext.instance(req), req.body.keyList);
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserEncryptionPaths.UPDATE_SETTINGS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserEncryptionPaths.REMOVE_KEYS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      UserEncryptionPaths.REMOVE_ALL_ACCOUNT_KEYS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.keyEntryService.removeAllAccountKeys(RequestContext.instance(req));
        const result = {
          success: true,
          results: true,
        };
        res.json(result);
      }),
    );

    this.router.post(
      UserEncryptionPaths.DELETE_RECOVERY_KEY,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
