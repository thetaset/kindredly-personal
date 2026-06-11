import {Router} from 'express';
import type {Routes} from '@interfaces/routes.interface';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '@/utils/auth_utils';
import {RequestContext} from '@/base/request_context';
import {UserType} from 'tset-sharedlib/shared.types';
import {AuditLogRepo} from '@/db/audit_log.repo';

class AuditLogRoute implements Routes {
  public router = Router();

  private auditLogRepo = new AuditLogRepo();

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SCH-OK
    this.router.post(
      '/audit_log/list',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/audit_log/list'>, res) => {
        const ctx = RequestContext.instance(req);

        const requestedUserId = req.body.userId || ctx.currentUserId;
        if (!requestedUserId) throw new Error('User not found');

        if (requestedUserId !== ctx.currentUserId) {
          await ctx.verifyAdminOverUser(requestedUserId);
          const targetUser = await ctx.getUserById(requestedUserId);
          if (targetUser?.type !== UserType.restricted) {
            throw new Error('Only restricted-user audit logs can be viewed by admins');
          }
        }

        const results = await this.auditLogRepo.listForUser(requestedUserId, {
          limit: req.body.limit || 50,
          cursor: req.body.cursor,
        });

        res.json({
          success: true,
          results,
        });
      }),
    );
  }
}

export default AuditLogRoute;
