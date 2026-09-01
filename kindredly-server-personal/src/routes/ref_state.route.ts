import {Routes} from '@interfaces/routes.interface';
import express, {Router} from 'express';
import {body} from 'express-validator';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '@/utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {RefStateService} from '@/services/ref_state.service';

class RefStateRoute implements Routes {
  public router = Router();
  private refStateService = new RefStateService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    const validateUpsert = [
      body('refType').notEmpty().isString(),
      body('refId').notEmpty().isString(),
      body('stateKey').notEmpty().isString(),
      body('stateSubKey').optional({nullable: true}).isString(),
      body('ownerId').optional().isString(),
      body('encrypted').optional().isBoolean(),
      body('encInfo').optional({nullable: true}).isObject(),
    ];

    // NOTE: these validator chains are currently inert — nothing in this codebase
    // calls `validationResult`, so they document intent rather than enforce it.
    // The limits that actually apply live in RefStateService (MAX_LIMIT,
    // MAX_BATCH_REFS, MAX_BATCH_LIMIT). Wiring validation up is a separate,
    // codebase-wide change.
    const validateList = [
      body('refType').notEmpty().isString(),
      body('refId').optional().isString(),
      body('refIds').optional().isArray({max: 200}),
      body('stateKey').optional().isString(),
      body('stateSubKey').optional({nullable: true}).isString(),
      body('stateSubKeyGte').optional().isString(),
      body('stateSubKeyLte').optional().isString(),
      body('ownerId').optional().isString(),
      body('limit').optional().isInt({min: 1, max: 500}),
      body('cursorUpdatedAt').optional().isString(),
      body('cursorRefId').optional().isString(),
      body('cursorStateSubKey').optional().isString(),
    ];

    const validateDelete = [
      body('refType').notEmpty().isString(),
      body('refId').notEmpty().isString(),
      body('stateKey').notEmpty().isString(),
      body('stateSubKey').optional({nullable: true}).isString(),
      body('ownerId').optional().isString(),
    ];

    // USER scope
    this.router.post(
      '/ref_state/user/upsert',
      // Excluded from app-level parsers (see app.ts bigBodyPaths): stores
      // arbitrary encrypted app-state blobs (mind maps, kanban boards) that can
      // exceed the default limit. Parser must precede auth (reads tempAuthToken).
      express.json({limit: '70mb'}),
      authenticateJWT,
      validateUpsert,
      errorHelper(async (req: ApiReq<'/ref_state/user/upsert'>, res) => {
        const ctx = RequestContext.instance(req);
        const entry = await this.refStateService.upsert(ctx, 'user', req.body as any);
        res.json({success: true, results: {entry}});
      }),
    );

    this.router.post(
      '/ref_state/user/list',
      authenticateJWT,
      validateList,
      errorHelper(async (req: ApiReq<'/ref_state/user/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.refStateService.list(ctx, 'user', req.body as any);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/ref_state/user/delete',
      authenticateJWT,
      validateDelete,
      errorHelper(async (req: ApiReq<'/ref_state/user/delete'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.refStateService.delete(ctx, 'user', req.body as any);
        res.json({success: true, results});
      }),
    );

    // ACCOUNT scope
    this.router.post(
      '/ref_state/account/upsert',
      // Excluded from app-level parsers (see app.ts bigBodyPaths): encrypted
      // app-state blobs. Parser must precede auth (reads tempAuthToken).
      express.json({limit: '70mb'}),
      authenticateJWT,
      validateUpsert,
      errorHelper(async (req: ApiReq<'/ref_state/account/upsert'>, res) => {
        const ctx = RequestContext.instance(req);
        const entry = await this.refStateService.upsert(ctx, 'account', req.body as any);
        res.json({success: true, results: {entry}});
      }),
    );

    this.router.post(
      '/ref_state/account/list',
      authenticateJWT,
      validateList,
      errorHelper(async (req: ApiReq<'/ref_state/account/list'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.refStateService.list(ctx, 'account', req.body as any);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/ref_state/account/delete',
      authenticateJWT,
      validateDelete,
      errorHelper(async (req: ApiReq<'/ref_state/account/delete'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.refStateService.delete(ctx, 'account', req.body as any);
        res.json({success: true, results});
      }),
    );
  }
}

export default RefStateRoute;
