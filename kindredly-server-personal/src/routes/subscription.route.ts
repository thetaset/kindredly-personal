import {RequestContext} from '@/base/request_context';
import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {authenticateJWT, errorHelper, getTargetUserId} from '../utils/auth_utils';
import SubscriptionService from '@/services/subscription.service';
import * as SubscriptionPaths from 'tset-sharedlib/api/SubscriptionPaths';
import { container } from '@/inversify.config';
// SCH-AUDIT-INCOMPLETE
class SubscriptionRoute implements Routes {
  public router = Router();

  private subscriptionService = container.resolve(SubscriptionService);

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {

    // SCH-OK
    this.router.post(
      SubscriptionPaths.SUBSCRIPTION_ADD,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.addEntry(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.refType,
          req.body.refId,
          req.body.data,
          req.body.encInfo,
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
      SubscriptionPaths.SUBSCRIPTION_REMOVE_BY_ID,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.removeSubscriptionById(
          RequestContext.instance(req),
          req.body.subscriptionId,
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
      SubscriptionPaths.SUBSCRIPTION_EDIT,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.editSubscriptionById(
          RequestContext.instance(req),
          req.body.subscriptionId,
          req.body.data,
          req.body.encInfo,
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
      SubscriptionPaths.SUBSCRIPTION_REMOVE,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.removeEntry(
          RequestContext.instance(req),
          getTargetUserId(req),
          req.body.refId,
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
      SubscriptionPaths.SUBSCRIPTION_LIST_FOR_USER,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.listWithDetailsByUserId(
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

    this.router.post(
      SubscriptionPaths.SUBSCRIPTION_LIST_FOR_REF,
      authenticateJWT,
      errorHelper(async (req, res) => {
        const results = await this.subscriptionService.listWithDetailByRef(
          RequestContext.instance(req),
          req.body.refId,
          req.body.refType,

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

export default SubscriptionRoute;
