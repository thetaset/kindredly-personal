import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';

import AccessRequestService from '@/services/access_request.service';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {body} from 'express-validator';

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
      '/access_request/listall',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/access_request/listall'>, res) => {
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
      '/access_request/listForUser',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/access_request/listForUser'>, res) => {
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
      '/access_request/remove',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/access_request/remove'>, res) => {
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
      '/access_request/add',
      authenticateJWT,
      body('key').notEmpty().isString(),
      body('message').isString().escape(),
      errorHelper(async (req: ApiReq<'/access_request/add'>, res) => {
        const results = await this.accessRequestService.addAccessRequest(
          RequestContext.instance(req),
          req.body.key,
          req.body.type || 'url',
          req.body.details,
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
      '/access_request/process',
      authenticateJWT,
      body('id').notEmpty().isString().escape(),
      body('status').isString().escape(),
      body('approverNote').optional({nullable: true}).isString().escape(),
      errorHelper(async (req: ApiReq<'/access_request/process'>, res) => {
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
