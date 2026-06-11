import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {body} from 'express-validator';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '@/utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {FamilyPolicyRuleService} from '@/services/family_policy_rule.service';

class FamilyPolicyRuleRoute implements Routes {
  public router = Router();
  private familyPolicyRuleService = new FamilyPolicyRuleService();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/familyPolicyRule/list',
      authenticateJWT,
      errorHelper(async (req, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.familyPolicyRuleService.list(ctx);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/familyPolicyRule/upsert',
      authenticateJWT,
      [body('data').exists(), body('_id').optional().isString(), body('encInfo').optional({nullable: true}).isObject()],
      errorHelper(async (req: ApiReq<'/familyPolicyRule/upsert'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.familyPolicyRuleService.upsert(ctx, req.body);
        res.json({success: true, results});
      }),
    );

    this.router.post(
      '/familyPolicyRule/delete',
      authenticateJWT,
      [body('ruleId').notEmpty().isString()],
      errorHelper(async (req: ApiReq<'/familyPolicyRule/delete'>, res) => {
        const ctx = RequestContext.instance(req);
        const results = await this.familyPolicyRuleService.delete(ctx, req.body);
        res.json({success: true, results});
      }),
    );
  }
}

export default FamilyPolicyRuleRoute;
