import {config} from '@/config';
import {logger} from '@/utils/logger';

/**
 * Observe-only authorization reporting.
 *
 * Authorization on this server is convention, not structure. A route calls `getTargetUserId(req)`,
 * which resolves `req.body.userId ?? req.body.targetUserId ?? req.authInfo.userId` — **the caller
 * names the target user** — and hands it to a service. Whether that is safe depends entirely on
 * the service happening to call one of the nine `verify*` primitives on `RequestContext`.
 *
 * `/user/options/update` is the shape of it: the route passes the caller-supplied id straight into
 * `userService.setUserOptions`, and the only thing standing between a child and their parent's
 * settings is one `ctx.verifyAdminPermissions(...)` line inside a 1,000-line service. Delete that
 * line and it still compiles, no test fails, and nothing is logged.
 *
 * This reports the case that actually matters: **a request that named a user other than the
 * authenticated one, and ran no authorization check at all.** Reads and self-targeted requests are
 * ignored, which keeps the output to a short, fixed list of routes worth looking at rather than a
 * few hundred lines of noise.
 *
 * It changes nothing. The intended sequence is: ship it, read the list from a real environment,
 * fix whatever it contains with tests, then make the condition a gate failure so new routes cannot
 * regress. That is the same end state as declarative per-route authorization, without rewriting
 * authorization on 103 endpoints for clients that cannot be rolled back.
 */

type Finding = {
  count: number;
  statuses: Set<number>;
  appVersions: Set<string>;
  firstSeenMs: number;
  lastSeenMs: number;
};

const REPORT_INTERVAL_MS = 15 * 60 * 1000;
const MAX_TRACKED_ROUTES = 300;

const findings = new Map<string, Finding>();
let lastReportMs = 0;
let droppedRoutes = 0;

/** Aggregated findings since process start. Exported for tests and future gating. */
export function getUncheckedAuthorizationFindings() {
  return [...findings.entries()]
    .map(([routePath, f]) => ({
      routePath,
      count: f.count,
      statuses: [...f.statuses],
      appVersions: [...f.appVersions],
      firstSeenMs: f.firstSeenMs,
      lastSeenMs: f.lastSeenMs,
    }))
    .sort((a, b) => b.count - a.count);
}

export function resetUncheckedAuthorizationFindings() {
  findings.clear();
  droppedRoutes = 0;
  lastReportMs = 0;
}

function record(routePath: string, statusCode: number, appVersion?: string) {
  const now = Date.now();
  const existing = findings.get(routePath);

  if (existing) {
    existing.count++;
    existing.lastSeenMs = now;
    existing.statuses.add(statusCode);
    if (appVersion && existing.appVersions.size < 10) existing.appVersions.add(appVersion);
    return;
  }

  if (findings.size >= MAX_TRACKED_ROUTES) {
    droppedRoutes++;
    return;
  }

  findings.set(routePath, {
    count: 1,
    statuses: new Set([statusCode]),
    appVersions: new Set(appVersion ? [appVersion] : []),
    firstSeenMs: now,
    lastSeenMs: now,
  });
}

function maybeReport() {
  const now = Date.now();
  if (now - lastReportMs < REPORT_INTERVAL_MS) return;
  lastReportMs = now;

  const all = getUncheckedAuthorizationFindings();
  if (all.length === 0) return;

  logger.warn(
    `[authz-observer] ${all.length} route(s) acted on a caller-named user with no authorization check` +
      (droppedRoutes > 0 ? ` (+${droppedRoutes} beyond the tracking cap)` : ''),
  );
  for (const f of all.slice(0, 25)) {
    logger.warn(
      `[authz-observer] ${f.routePath} (x${f.count}, statuses: ${f.statuses.join(',')}` +
        `${f.appVersions.length ? `, appVersions: ${f.appVersions.join(',')}` : ''})`,
    );
  }
}

/** The caller named a user other than themselves. */
function namedForeignTarget(req: any): boolean {
  const body = req?.body;
  if (!body || typeof body !== 'object') return false;

  const named = body.userId || body.targetUserId;
  if (!named || typeof named !== 'string') return false;

  const authUserId = req?.authInfo?.userId;
  if (!authUserId) return false;

  return named !== authUserId;
}

export const authorizationObserverMiddleware = (req: any, res: any, next: any) => {
  try {
    if (!config.observeAuthorizationChecks) return next();

    res.on('finish', () => {
      try {
        // A request that failed was not authorized by definition — only completed work matters.
        if (res.statusCode >= 400) return;
        if (!namedForeignTarget(req)) return;

        // No context means the route never authenticated, so there is nothing to have checked.
        const ctx = req.ctx;
        if (!ctx) return;
        if (ctx.authChecks && ctx.authChecks.size > 0) return;

        const appVersion = String(req.headers?.tsappversion || '').slice(0, 24) || undefined;
        record(req.path, res.statusCode, appVersion);
        maybeReport();
      } catch (e) {
        logger.warn(`[authz-observer] reporting error: ${(e as Error)?.message}`);
      }
    });
  } catch (e) {
    logger.warn(`[authz-observer] observer error: ${(e as Error)?.message}`);
  }

  return next();
};

export default authorizationObserverMiddleware;
