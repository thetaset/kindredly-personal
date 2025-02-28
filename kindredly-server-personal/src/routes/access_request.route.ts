import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';

import AccessRequestService from '@/services/access_request.service';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import { body } from 'express-validator';
import * as AccessRequestPaths  from 'tset-sharedlib/api/AccessRequestPaths';

class AccessRequestRoute implements Routes {
  public router = Router();
  private accessRequestService = new AccessRequestService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {

    // SCH-OK
    this.router.post(
      AccessRequestPaths.ACCESS_REQUEST_LIST_ALL,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.accessRequestService.listAllAccessRequestsInAccount(RequestContext.instance(req));
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    this.router.post(
      AccessRequestPaths.ACCESS_REQUEST_LIST_FOR_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.accessRequestService.listAccessRequestsByRequesterId(
          RequestContext.instance(req),
          getTargetUserId(req),
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
      AccessRequestPaths.ACCESS_REQUEST_REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const id = req.body.id;
        const results = await this.accessRequestService.removeAccessRequestById(RequestContext.instance(req), id);
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK
    // TODO: Needs Support for Encryption on Key
    this.router.post(
      AccessRequestPaths.ACCESS_REQUEST_ADD,
      authenticateJWT,
      body('key').notEmpty().isString(),
      body('message').isString().escape(),
      errorHelper(async (req, res) => {
        const results = await this.accessRequestService.addAccessRequest(
          RequestContext.instance(req),
          req.body.key,
          req.body.additionalInfo,
          req.body.message,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );

    // SCH-OK - uses accountId
    this.router.post(
      AccessRequestPaths.ACCESS_REQUEST_PROCESS,
      authenticateJWT,
      body('id').notEmpty().isString().escape(),
      body('status').isString().escape(),
      body('approverNote').isString().escape(),
      errorHelper(async (req, res) => {
        const results = await this.accessRequestService.processAccessRequest(
          RequestContext.instance(req),
          req.body.id,
          req.body.status,
          req.body.approverNote,
        );
        const result = {
          success: true,
          results: results,
        };
        res.json(result);
      }),
    );
  }
}

export default AccessRequestRoute;
