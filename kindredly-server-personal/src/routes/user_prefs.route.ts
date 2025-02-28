import { Routes } from "@interfaces/routes.interface";
import { Router } from "express";

import {
  authenticateJWT,
  errorHelper,
  getTargetUserId,
} from "../utils/auth_utils";

import UserService from "@/services/user.service";

import { RequestContext } from "@/base/request_context";
import PluginService from "@/services/plugin.service";
import * as UserPrefsPaths from "tset-sharedlib/api/UserPrefsPaths";

class UserPrefsRoute implements Routes {
  public router = Router();

  private userService = new UserService();
  private pluginService = new PluginService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PUBLIC_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.userService.updateUserPublicProfile(
          RequestContext.instance(req),
          req.body.data
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
      UserPrefsPaths.OPTIONS_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.userService.setUserOptions(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.options
        );
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      })
    );


    // SCH-OK
    this.router.post(
      UserPrefsPaths.PROFILE_IMAGE_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.userService.updateProfileImage(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.imageData
        );
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PROFILE_GET,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const profile = await this.userService.getUserProfileById(
          RequestContext.instance(req),
          req.body.viewAsUserId,
          req.body.userProfileId
        );

        const result = {
          success: true,
          results: profile,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PREFS_GET,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const prefs = await this.userService.getUserPrefs(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.keys
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PREFS_GET_VALUE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const prefs = await this.userService.getUserPrefsValue(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.key
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PREFS_DEFAULTS,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const prefs = await this.userService.getUserPrefsDefaults(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.key
        );

        const result = {
          success: true,
          results: prefs,
        };
        res.json(result);
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PREFS_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.userService.updateUserPrefs(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.updates
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
      UserPrefsPaths.PLUGIN_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      })
    );

    // SCH-OK
    this.router.post(
      UserPrefsPaths.PLUGIN_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        await this.pluginService.setUserPlugins(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.pluginIds
        );
        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      })
    );
  }
}

export default UserPrefsRoute;
