import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import {authenticateJWT, errorHelper, removeSensitiveInfoFromUser} from '../utils/auth_utils';

import AccountService from '@/services/account.service';

import UserService from '@/services/user.service';

import {config} from '@/config';
import {container} from '@/inversify.config';
import {RequestContext} from '@/base/request_context';
import VerificationService from '@/services/verification.service';

class AccountRoute implements Routes {
  public router = Router();

  private userService = new UserService();

  private accountService = container.resolve(AccountService);
  private verificationService = new VerificationService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    if (config.privateServer) {
      // SCH-OK
      this.router.post(
        '/account/info',
        authenticateJWT,
        errorHelper(async (req: ApiReq<'/account/info'>, res) => {
          const account = await this.accountService.getAccountDetails(RequestContext.instance(req));
          const result = {
            success: true,
            results: account,
          };
          res.json(result);
        }),
      );

      this.router.post(
        '/account/delete',
        authenticateJWT,
        errorHelper(async (req: ApiReq<'/account/delete'>, res) => {
          await this.accountService.deleteAccountForPersonalServer(RequestContext.instance(req), req.body.confirmation);
          res.json({success: true, results: null});
        }),
      );
    }

    // Back-compat alias (client calls /invite/getInfo)
    this.router.post(
      '/invite/getInfo',
      errorHelper(async (req: ApiReq<'/invite/getInfo'>, res) => {
        console.log('invite:', req.body);
        const result = await this.verificationService.getFamilyInviteInfo(req.body.code);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      '/invite/create',
      authenticateJWT,

      errorHelper(async (req: ApiReq<'/invite/create'>, res) => {
        console.log('invite:', req.body);
        const result = await this.accountService.createAccountInvite(RequestContext.instance(req), req.body.inviteData);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      '/contact/invite/checkCode',
      errorHelper(async (req: ApiReq<'/invite/checkCode'>, res) => {
        const code = req.body.code;
        const isValidCode = config.inviteCodes && code && config.inviteCodes.includes(code);
        const result = {
          success: true,
          results: {isValidCode},
        };
        res.json(result);
      }),
    );

    // Back-compat alias (client calls /invite/checkCode)
    this.router.post(
      '/invite/checkCode',
      errorHelper(async (req: ApiReq<'/invite/checkCode'>, res) => {
        const code = req.body.code;
        const isValidCode = config.inviteCodes && code && config.inviteCodes.includes(code);
        const result = {
          success: true,
          results: {isValidCode},
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/stats',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/stats'>, res) => {
        const results = await this.accountService.getAccountStats(RequestContext.instance(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/getSpaceUsage',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/getSpaceUsage'>, res) => {
        const result = await this.accountService.checkSpaceUsage(RequestContext.instance(req));
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/options/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/options/update'>, res) => {
        const results = await this.accountService.updateAccountOptions(RequestContext.instance(req), req.body.options);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/assistantReview/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/assistantReview/update'>, res) => {
        const results = await this.accountService.updateAssistantReview(
          RequestContext.instance(req),
          req.body.targetUserId || null,
          req.body.entry,
          req.body.appendCustomText,
          req.body.template,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // Family Downtime — each an admin-only locked patch that returns the stored settings.
    // SCH-OK
    this.router.post(
      '/account/familyDowntime/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/familyDowntime/update'>, res) => {
        const {enabled, schedules, allow} = req.body || {};
        const patch = {
          ...(enabled !== undefined ? {enabled} : {}),
          ...(schedules !== undefined ? {schedules} : {}),
          ...(allow !== undefined ? {allow} : {}),
        };
        const results = await this.accountService.updateFamilyDowntime(RequestContext.instance(req), patch);
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/familyDowntime/oneOff/add',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/familyDowntime/oneOff/add'>, res) => {
        const results = await this.accountService.addFamilyDowntimeOneOff(
          RequestContext.instance(req),
          Number(req.body?.startAt),
          Number(req.body?.endAt),
        );
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/familyDowntime/oneOff/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/familyDowntime/oneOff/remove'>, res) => {
        const results = await this.accountService.removeFamilyDowntimeOneOff(
          RequestContext.instance(req),
          String(req.body?.id || ''),
        );
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/familyDowntime/endNow',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/familyDowntime/endNow'>, res) => {
        const results = await this.accountService.endFamilyDowntimeNow(RequestContext.instance(req));
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/familyDowntime/dismiss',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/familyDowntime/dismiss'>, res) => {
        const results = await this.accountService.dismissFamilyDowntime(RequestContext.instance(req));
        res.json({success: true, results});
      }),
    );

    // Extended Features (Account-level)
    this.router.post(
      '/account/extendedFeatures/get',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/extendedFeatures/get'>, res) => {
        const extendedFeatures = await this.accountService.getExtendedFeatures(RequestContext.instance(req));
        res.json({success: true, results: {extendedFeatures}});
      }),
    );

    this.router.post(
      '/account/extendedFeatures/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/extendedFeatures/update'>, res) => {
        await this.accountService.updateExtendedFeatures(RequestContext.instance(req), req.body.updates);
        res.json({success: true, results: {success: true}});
      }),
    );

    this.router.post(
      '/account/keyStoragePolicy/update',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/keyStoragePolicy/update'>, res) => {
        const results = await this.accountService.updateKeyStoragePolicy(
          RequestContext.instance(req),
          req.body.noServerKeyStorage,
        );
        res.json({success: true, results});
      }),
    );

    // SCH-OK
    this.router.post(
      '/account/users',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/users'>, res) => {
        const ctx = RequestContext.instance(req);

        const users = await this.userService.getUsersForAccount(ctx);

        const result = {
          success: true,
          results: users,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/account/invites/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/invites/list'>, res) => {
        const results = await this.verificationService.listFamilyInvites(RequestContext.instance(req));

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      '/account/invites/cancel',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/account/invites/cancel'>, res) => {
        await this.verificationService.cancelFamilyInvite(RequestContext.instance(req), req.body.code);

        const result = {
          success: true,
          results: {},
        };
        res.json(result);
      }),
    );
  }
}

export default AccountRoute;
