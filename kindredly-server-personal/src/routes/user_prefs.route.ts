import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';

import UserService from '@/services/user.service';
import LibraryAutoApprovalService from '@/services/library_auto_approval.service';

import {RequestContext} from '@/base/request_context';
import PluginService from '@/services/plugin.service';

class UserPrefsRoute implements Routes {
  public router = Router();

  private userService = new UserService();
  private pluginService = new PluginService();
  private libraryAutoApprovalService = new LibraryAutoApprovalService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/user/public/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/public/update'>, res) => {
        const results = await this.userService.updateUserPublicProfile(RequestContext.instance(req), req.body.data);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/options/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/options/update'>, res) => {
        await this.userService.setUserOptions(RequestContext.instance(req), getTargetUserId(req), req.body.options);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/settings/copy',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/settings/copy'>, res) => {
        const results = await this.userService.copyUserSettings(RequestContext.instance(req), req.body);
        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/profileImage/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/profileImage/update'>, res) => {
        await this.userService.updateProfileImage(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.imageData,
        );
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/profile/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/profile/get'>, res) => {
        const profile = await this.userService.getUserProfileById(
          RequestContext.instance(req),
          req.body.viewAsUserId,
          req.body.userId,
        );

        const result = {
          success: true,
          results: profile,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/prefs/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/prefs/get'>, res) => {
        const prefs = await this.userService.getUserPrefs(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.keys,
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/prefs/getValue',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/prefs/getValue'>, res) => {
        const prefs = await this.userService.getUserPrefsValue(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.key,
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/prefs/defaultsByKey',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/prefs/defaultsByKey'>, res) => {
        const prefs = await this.userService.getUserPrefsDefaults(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.key,
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/prefs/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/prefs/update'>, res) => {
        const results = await this.userService.updateUserPrefs(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.updates,
        );

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/user/libraryAutoApproval/evaluate',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/libraryAutoApproval/evaluate'>, res) => {
        const results = await this.libraryAutoApprovalService.evaluateAndApply(RequestContext.instance(req), req.body);

        const result = {
          success: true,
          results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/plugin/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/plugin/list'>, res) => {
        const userId = getTargetUserId(req);
        const ctx = RequestContext.instance(req);
        await ctx.verifySelfOrAdmin(userId);
        const user = await ctx.getUserById(userId);
        let items = [];
        if (user.plugins && user.plugins.length > 0) {
          try {
            items = await this.pluginService.listSitePluginsByIds(user.plugins);
          } catch (e) {
            console.error(e);
          }
        }
        const result = {
          success: true,
          results: items,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/user/plugin/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/user/plugin/update'>, res) => {
        await this.pluginService.setUserPlugins(RequestContext.instance(req), getTargetUserId(req), req.body.pluginIds);
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );
  }
}

export default UserPrefsRoute;
