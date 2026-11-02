import {NextFunction, Request, Response} from 'express';
import {config} from '@/config';

/**
 * Refuses any spelling of an admin or curation-AI path except the exact one.
 *
 * In production the load balancer lets `/v3.0/admin/*` and `/v3.0/agent/*` through only from the
 * founder's addresses, and refuses them from anywhere else (`local_admin_access_aws.sh`,
 * docs/guides/admin-lockdown.md). Its path rules are literal and case-sensitive. Express routing
 * is neither: `/v3.0/ADMIN/signin`, `/V3.0/admin/signin` and `/v3.0//admin/signin` all reach the
 * admin sign-in, and none of them match the load balancer's rule, so each would walk past the
 * address check. This middleware closes that: a request whose path *means* an admin or agent
 * path must also be *spelled* exactly as the load balancer's rule spells it, or it gets a 404.
 */
export function guardedPathSpelling(rawUrl: string, apiVersion = config.apiVersion): 'exact' | 'variant' | 'other' {
  const raw = String(rawUrl || '').split('?')[0];
  let meaning = raw;
  try {
    meaning = decodeURIComponent(raw);
  } catch {
    // A malformed escape is not one of ours; compare it as written.
  }
  meaning = meaning.replace(/\/{2,}/g, '/').toLowerCase();
  const roots = [`/${apiVersion}/admin`, `/${apiVersion}/agent`].map((r) => r.toLowerCase());
  const guarded = roots.some((root) => meaning === root || meaning.startsWith(`${root}/`));
  if (!guarded) return 'other';
  const exact =
    [`/${apiVersion}/admin/`, `/${apiVersion}/agent/`].some((prefix) => raw.startsWith(prefix)) &&
    !raw.includes('//') &&
    !raw.includes('%');
  return exact ? 'exact' : 'variant';
}

export function adminPathGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  if (guardedPathSpelling(req.originalUrl || req.url) === 'variant') {
    res.sendStatus(404);
    return;
  }
  next();
}
