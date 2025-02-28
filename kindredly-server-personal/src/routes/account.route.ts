import { Routes } from '@interfaces/routes.interface';
import { Router } from 'express';

import {
  authenticateJWT,
  errorHelper,
  removeSensitiveInfoFromUser
} from '../utils/auth_utils';

import AccountService from '@/services/account.service';

import UserService from '@/services/user.service';

import { config } from '@/config';
import { container } from '@/inversify.config';
import ImportExportService from '@/services/import_export.service';
import { RequestContext } from '@/base/request_context';
import VerificationService from '@/services/verification.service';
import * as AccountPaths from 'tset-sharedlib/api/AccountPaths';
import * as ContactPaths from 'tset-sharedlib/api/ContactPaths';
class AccountRoute implements Routes {
  public router = Router();

  private userService = new UserService();

  private accountService = container.resolve(AccountService);
  private importExportService = new ImportExportService();
  private verificationService = new VerificationService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);

    this.initializeRoutes();
  }

  private initializeRoutes() {


    if (config.privateServer) {
      // SCH-OK
      this.router.post(
        AccountPaths.ACCOUNT_INFO,
        authenticateJWT,
        errorHelper(async (req, res) => {
          const account = await this.accountService.getAccountDetails(RequestContext.instance(req));
          const result = {
            success: true,
            results: account,
          };
          res.json(result);
        }),
      );
    }


    this.router.post(
      ContactPaths.INVITE_GET_INFO,
      errorHelper(async (req, res) => {
        console.log('invite:', req.body);
        const result = await this.verificationService.getFamilyInviteInfo( req.body.code);
        res.json({success: true, results: result});
      }),
    );

    // SCH-OK
    this.router.post(
      ContactPaths.INVITE_CREATE,
      authenticateJWT,

      errorHelper(async (req, res) => {
        console.log('invite:', req.body);
        const result = await this.accountService.createAccountInvite(RequestContext.instance(req), req.body.inviteData);
        res.json({success: true, results: result});
      }),
    );


    // SCH-OK
    this.router.post(
      ContactPaths.INVITE_CHECK_CODE,
      errorHelper(async (req, res) => {
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
      AccountPaths.ACCOUNT_STATS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      AccountPaths.ACCOUNT_SPACE_USAGE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const result = await this.accountService.checkSpaceUsage(RequestContext.instance(req));
        res.json({ success: true, results: result });
      }),
    );

    // SCH-OK
    this.router.post(
      AccountPaths.ACCOUNT_OPTIONS_UPDATE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.accountService.updateAccountOptions(RequestContext.instance(req), req.body.data);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      AccountPaths.ACCOUNT_USERS,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
      AccountPaths.ACCOUNT_EXPORT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.importExportService.exportCollections(
          RequestContext.instance(req),
          req.body.options,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      AccountPaths.ACCOUNT_IMPORT,
      // express.json({
      //     limit: "50mb"
      // }),
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.importExportService.loadImport(RequestContext.instance(req), req.body.importData);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );



    this.router.post(
      AccountPaths.ACCOUNT_INVITES_LIST,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.verificationService.listFamilyInvites(RequestContext.instance(req));

        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    this.router.post(
      AccountPaths.ACCOUNT_INVITES_CANCEL,
      authenticateJWT,
      errorHelper(async (req, res) => {
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
