import Ajv, {ValidateFunction} from 'ajv';

import {config} from '@/config';
import {logger} from '@/utils/logger';

import requestSchemas from 'tset-sharedlib/api/request-schemas.generated.json';

/**
 * Observe-only request validation.
 *
 * ~469 handlers read `req.body.*` guarded only by compile-time types, which are erased at runtime.
 * `ApiRouteMap` already describes every request shape, so this checks incoming bodies against the
 * generated schemas and **logs** what disagrees. It rejects nothing.
 *
 * That restraint is the point. Clients already installed — store extensions, App Store and Play
 * builds, desktop installs — cannot be updated on demand, so enforcing a shape that some shipped
 * build has always sent slightly differently would break them with no way back. The mismatches
 * logged here are the evidence needed to decide what is actually safe to enforce later, and they
 * seed the shipped-version contract fixtures.
 *
 * Design constraints, in order of importance:
 *  1. Never affect the response. Every path through here is wrapped so a bug cannot fail a request.
 *  2. Never flood the logs. Findings are aggregated per route + problem and reported periodically.
 *  3. Cost little. Validators compile on first use per route, not at boot.
 */

type Finding = {
  count: number;
  keyword: string;
  message: string;
  firstSeenMs: number;
  lastSeenMs: number;
  appVersions: Set<string>;
};

const REPORT_INTERVAL_MS = 15 * 60 * 1000;
const MAX_TRACKED_FINDINGS = 500;

const schemaDoc = requestSchemas as {
  routes: Record<string, string>;
  definitions: Record<string, unknown>;
};

// `strict: false` because these schemas are generated from TypeScript, not hand-written for Ajv,
// and carry annotations Ajv would otherwise reject. `allErrors` so one request reports every
// mismatch rather than only the first.
const ajv = new Ajv({strict: false, allErrors: true, validateFormats: false});
ajv.addSchema({...schemaDoc, $id: 'requestSchemas'}, 'requestSchemas');

const validatorCache = new Map<string, ValidateFunction | null>();
const findings = new Map<string, Finding>();
let lastReportMs = 0;
let droppedFindings = 0;

function getValidator(routePath: string): ValidateFunction | null {
  // Unknown paths (scanner/bot traffic can POST any path under the version
  // prefix) must never enter the cache — its key space would be unbounded.
  // Known routes cache even a failed compile (null), bounded by the route map.
  const ref = schemaDoc.routes?.[routePath];
  if (!ref) return null;

  if (validatorCache.has(routePath)) return validatorCache.get(routePath);

  let validator: ValidateFunction | null = null;
  try {
    validator = ajv.compile({$ref: `requestSchemas${ref}`});
  } catch (e) {
    // A schema Ajv cannot compile means this route goes unobserved — never that it fails.
    logger.warn(`[request-shape] cannot compile schema for ${routePath}: ${(e as Error)?.message}`);
    validator = null;
  }

  validatorCache.set(routePath, validator);
  return validator;
}

/** Cache size, exported so tests can pin the unknown-path no-cache guarantee. */
export function getValidatorCacheSize(): number {
  return validatorCache.size;
}

function record(routePath: string, keyword: string, instancePath: string, message: string, appVersion?: string) {
  const key = `${routePath}|${instancePath || '(root)'}|${keyword}`;
  const now = Date.now();
  const existing = findings.get(key);

  if (existing) {
    existing.count++;
    existing.lastSeenMs = now;
    if (appVersion && existing.appVersions.size < 10) existing.appVersions.add(appVersion);
    return;
  }

  if (findings.size >= MAX_TRACKED_FINDINGS) {
    droppedFindings++;
    return;
  }

  findings.set(key, {
    count: 1,
    keyword,
    message,
    firstSeenMs: now,
    lastSeenMs: now,
    appVersions: new Set(appVersion ? [appVersion] : []),
  });
}

/** Aggregated mismatches since process start. Exported for tests and future contract tooling. */
export function getRequestShapeFindings() {
  return [...findings.entries()]
    .map(([key, f]) => {
      const [routePath, instancePath, keyword] = key.split('|');
      return {
        routePath,
        instancePath,
        keyword,
        message: f.message,
        count: f.count,
        appVersions: [...f.appVersions],
        firstSeenMs: f.firstSeenMs,
        lastSeenMs: f.lastSeenMs,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function resetRequestShapeFindings() {
  findings.clear();
  validatorCache.clear();
  droppedFindings = 0;
  lastReportMs = 0;
}

function maybeReport() {
  const now = Date.now();
  if (now - lastReportMs < REPORT_INTERVAL_MS) return;
  lastReportMs = now;

  const all = getRequestShapeFindings();
  if (all.length === 0) return;

  logger.warn(
    `[request-shape] ${all.length} distinct mismatches observed` +
      (droppedFindings > 0 ? ` (+${droppedFindings} beyond the tracking cap)` : ''),
  );
  for (const f of all.slice(0, 25)) {
    logger.warn(
      `[request-shape] ${f.routePath} ${f.instancePath} ${f.keyword}: ${f.message} ` +
        `(x${f.count}${f.appVersions.length ? `, appVersions: ${f.appVersions.join(',')}` : ''})`,
    );
  }
}

const API_PREFIX = `/${config.apiVersion}`;

/** Strip the version prefix so the path matches the route map's keys. */
function toRouteMapPath(reqPath: string): string | null {
  if (!reqPath.startsWith(API_PREFIX + '/')) return null;
  return reqPath.slice(API_PREFIX.length);
}

export const requestShapeObserverMiddleware = (req: any, res: any, next: any) => {
  try {
    if (!config.observeRequestShapes) return next();
    if (req.method !== 'POST') return next();
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next();

    const routePath = toRouteMapPath(req.path);
    if (!routePath) return next();

    const validator = getValidator(routePath);
    if (!validator) return next();

    if (!validator(req.body)) {
      const appVersion = String(req.headers?.tsappversion || '').slice(0, 24) || undefined;
      for (const err of validator.errors || []) {
        // `additionalProperties` is deliberately not reported: extra fields are how clients stay
        // forward-compatible, and flagging them would bury the mismatches that actually matter —
        // a missing required field or a wrong type.
        if (err.keyword === 'additionalProperties') continue;
        record(routePath, err.keyword, err.instancePath, err.message || '', appVersion);
      }
    }

    maybeReport();
  } catch (e) {
    // Observation must never be the reason a request fails.
    logger.warn(`[request-shape] observer error: ${(e as Error)?.message}`);
  }

  return next();
};

export default requestShapeObserverMiddleware;
