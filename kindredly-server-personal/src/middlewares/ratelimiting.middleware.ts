import {NextFunction, Request, Response} from 'express';
import {RateLimiterMemory, RateLimiterRedis} from 'rate-limiter-flexible';
import {asPath} from '../utils/crypto_util';
import slowDown from 'express-slow-down';
import {config} from '@/config';
import {requireIoRedis} from '@/base/redis_client';
import {logger} from '@/utils/logger';
import {isRateLimitingEnabled} from '@/services/rate_limit_switch';
import {verifiedUserIdSync} from '@/utils/auth_utils';
import {recordSecurityEvent, SECURITY_EVENT_TYPES} from '@/services/security_event.service';
import {RedisSlowDownStore} from './redis_slowdown_store';

// Configure Rate Limiter
const rateLimitConfig = config.rateLimiting;

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Build a limiter backed by Redis so the budget is shared across processes.
 *
 * This previously used RateLimiterMemory, which gives every process its own private
 * counter. PM2 runs `instances: 2` in cluster mode and ECS runs 2-8 tasks, so a limit
 * configured as 300/min was really being enforced somewhere between 1,200 and 4,800/min —
 * and it got *looser* as autoscaling added tasks, which is precisely backwards: the limit
 * relaxed exactly when the system was under the most load.
 *
 * `insuranceLimiter` keeps the previous in-memory behaviour as a fallback. If Redis is
 * unreachable the limiter degrades to per-process counting rather than failing open
 * entirely, so a Redis outage costs accuracy, not enforcement.
 *
 * The test environment stays on memory: Redis is lazy-connected there, and a limiter that
 * needs a live server would make the middleware's own tests depend on external state.
 */
export type RateLimiterBackend = 'redis' | 'memory';

/**
 * Which store each bucket ended up on, so the admin diagnostic can report what limiting is
 * actually running on rather than what it was configured to run on. A silent fall back to
 * memory is the failure mode worth surfacing: everything keeps working and the real limit
 * quietly multiplies by the process count.
 */
const limiterBackends: Record<string, RateLimiterBackend> = {};

type BucketOpts = {points: number; duration: number; blockDuration: number};

/**
 * @param reportAs Which name this limiter's store is recorded under for the diagnostic, or
 *   `null` to record nothing. Each bucket has two limiters sharing one Redis connection, and
 *   listing both would double every row in the diagnostic to say the same thing twice.
 */
export function createLimiter(keyPrefix: string, opts: BucketOpts, reportAs: string | null = keyPrefix) {
  const report = (backend: RateLimiterBackend) => {
    if (reportAs) limiterBackends[reportAs] = backend;
  };

  // `lite` is one process with no Redis, so a shared store buys nothing it does not
  // already have. Memory-backed limiting is the swap, not a downgrade to none - a box
  // that skipped rate limiting entirely would be a security regression, and
  // requireIoRedis() here is what put a box into an endless reconnect loop at boot.
  if (isTestEnv || config.profile === 'lite') {
    report('memory');
    return new RateLimiterMemory(opts);
  }

  try {
    const limiter = new RateLimiterRedis({
      ...opts,
      storeClient: requireIoRedis(),
      keyPrefix: `rl_${keyPrefix}`,
      insuranceLimiter: new RateLimiterMemory(opts),
    });
    report('redis');
    return limiter;
  } catch (error) {
    logger.error(`Rate limiter '${keyPrefix}' could not use Redis; falling back to per-process memory`, error);
    report('memory');
    return new RateLimiterMemory(opts);
  }
}

/** Per-bucket store, for the admin diagnostic. Read-only snapshot. */
export function getRateLimiterBackends(): Record<string, RateLimiterBackend> {
  return {...limiterBackends};
}

/**
 * The limiters no longer refuse anything. Nothing in this file returns 429.
 *
 * This is a deliberate product decision, not an oversight. A refused request is indissoluble
 * from a broken product: the person on the other end cannot tell "you went too fast" from
 * "this doesn't work", and the consequence of wrongly refusing a family's traffic is far
 * worse than the consequence of serving it slowly. Every case a hard cap was protecting
 * against — a burst, a sync storm, a client stuck in a loop, even credential stuffing — is
 * handled at least as well by making each request progressively slower, because a caller
 * that can only get six requests a minute is not a threat to anything.
 *
 * So the buckets exist for two things now:
 *   1. They set the *shape of the delay curve* (see `slowdownDelayMs`) — `points` is the
 *      volume at which pushback becomes real, not the volume at which service stops.
 *   2. They feed the security ledger, so heavy overuse is still visible to an operator even
 *      though it is never blocked.
 *
 * Keep it that way. If some future change needs to shed load, shed it by delaying more, not
 * by rejecting.
 */
type BucketLimiters = {
  /** Counts usage so a breach can be recorded. Its rejection is swallowed, never surfaced. */
  meter: {consume: (key: string) => Promise<unknown>};
  /** Configured points, for the ledger and the delay curve. */
  points: number;
};

function createBucket(name: string, opts: BucketOpts): BucketLimiters {
  // blockDuration is irrelevant to a meter that never refuses; zero it so the counter simply
  // tracks the window. Leaving it set would be a trap for whoever reads this next.
  return {
    meter: createLimiter(name, {...opts, blockDuration: 0}),
    points: opts.points,
  };
}

const buckets = {
  default: createBucket('default', rateLimitConfig.default),
  special: createBucket('special', rateLimitConfig.special),
  auth: createBucket('auth', rateLimitConfig.auth),
  media: createBucket('media', rateLimitConfig.media),
};

export const loginSpeedLimiter = slowDown({
  windowMs: rateLimitConfig.loginSpeed.windowMs,
  delayAfter: rateLimitConfig.loginSpeed.delayAfter,
  delayMs: () => rateLimitConfig.loginSpeed.delayMs,
});

/**
 * What a request is counted against.
 *
 * A signed-in request is counted against the **user**, not the address it came from.
 * Everything except the AI bucket used to key on `req.ip`, which meant one household shared
 * one budget: a family of four behind one router got a quarter of the configured limit each,
 * and it got worse the bigger the family. A school or an apartment block behind NAT was
 * worse still. None of that is abuse, but all of it looked like abuse to the limiter.
 *
 * Unauthenticated traffic keys on the address, because there is nothing else to key on —
 * and that is the traffic where an address is the right unit anyway.
 *
 * The user is taken from a **verified** token, not from `req.authInfo`: this middleware is
 * mounted globally in app.ts, ahead of every route's `authenticateJWT`, so `authInfo` does
 * not exist yet. Verifying rather than decoding is what stops someone minting a userId to
 * hand themselves a fresh budget per forged id.
 *
 * The `u:` / `ip:` prefixes keep the two namespaces from ever colliding.
 */
const KEY_CACHE = Symbol('rateLimitKey');

export function rateLimitKey(req: Request): string {
  // Memoized per request: the slow-down layer, the limiter and the ledger detail all ask
  // for this, and each miss costs a signature verification.
  const cached = (req as any)[KEY_CACHE];
  if (cached) return cached;

  const userId = (req as any)?.authInfo?.userId || verifiedUserIdSync(req);
  const key = userId ? `u:${userId}` : `ip:${req.ip}`;
  (req as any)[KEY_CACHE] = key;
  return key;
}

/**
 * Progressive delay, applied BEFORE the hard cap on the ordinary buckets.
 *
 * A burst is usually a real person doing something reasonable — opening a page full of
 * images, or a client catching up after being offline. Refusing those outright turns a
 * momentary spike into a visible error; slowing them down turns it into a slightly slower
 * page and nothing more. Only traffic that keeps going after the delay reaches the 429.
 *
 * Keyed the same way as the limiter, so it inherits the per-user fix rather than
 * re-introducing the household collision one layer up.
 *
 * `validate.xForwardedForHeader: false` because trust-proxy is configured centrally in
 * app.ts (`trustProxyHops`); express-slow-down's own check does not know about that and
 * would warn on every request.
 */
/**
 * Delay begins only in the last quarter before the hard cap.
 *
 * A cushion in front of the wall, not a general throttle. Starting earlier (half the budget
 * was the first attempt) slows ordinary use — a syncing client legitimately exceeds half of
 * 300/min — and a limiter that makes the normal case slower to protect against the rare one
 * is a bad trade.
 */
/**
 * Where each bucket's ramp begins, as a fraction of its own limit.
 *
 * Three quarters for ordinary traffic: a burst is usually a real person doing something
 * reasonable, and slowing the normal case to protect against the rare one is a bad trade.
 *
 * **Auth is deliberately different.** Its ramp starts almost immediately, because the thing
 * it guards against — someone guessing passwords — looks exactly like ordinary traffic until
 * you count it. Leaving auth at 0.75 gave an attacker a large block of completely free
 * attempts every minute before any pushback at all, which is worse than the hard cap it
 * replaced. Starting at a tenth costs a real person nothing (the delay at ten attempts is
 * ~150ms, and nobody signs in ten times a minute) while putting a guessing run into
 * multi-second territory almost at once.
 */
const RAMP_START_FRACTION: Record<Bucket, number> = {
  default: 0.75,
  special: 0.75,
  media: 0.75,
  auth: 0.1,
};
/**
 * The delay once a key has used its whole configured budget.
 *
 * Two seconds is where a burst stops being free but a person still reads it as "loading".
 * Reaching the configured limit is no longer an error condition — it is the point at which
 * the system starts pushing back.
 */
const SLOWDOWN_AT_LIMIT_MS = 2000;
/**
 * Ceiling on the delay, and where the curve reaches it.
 *
 * Nothing is ever refused, so the delay is the *only* mechanism and it has to be able to
 * stop a runaway client on its own. Ten seconds per request means a client stuck in a loop
 * gets six requests a minute per connection — slow enough to be harmless, and still served.
 *
 * Kept well under the client's own 60s fetch timeout (see RemoteRequester): a delay long
 * enough to trip that timeout would reintroduce hard failure through the back door, and the
 * abandoned request would be retried, turning one held connection into two.
 */
const SLOWDOWN_MAX_MS = 10_000;
/** Multiple of the configured limit at which the delay reaches SLOWDOWN_MAX_MS. */
const SLOWDOWN_MAX_AT_MULTIPLE = 2;

type Bucket = 'default' | 'special' | 'media' | 'auth';

/** Where the ramp begins for a bucket, derived from its cap so the two cannot drift. */
export function slowdownThreshold(bucket: Bucket): number {
  return Math.max(1, Math.floor(rateLimitConfig[bucket].points * RAMP_START_FRACTION[bucket]));
}

/**
 * The delay a request gets, given how many it is into the window. Exported for its tests.
 *
 * Two straight segments, both expressed as fractions of the bucket's own limit so the shape
 * is identical whether the bucket allows 60/min or 20,000/min:
 *
 *   ..ramp start     0ms          — ordinary use is untouched
 *   start -> 100%    0 -> 2s      — the burst cushion
 *   100% -> 200%     2s -> 10s    — sustained overuse, pushed back hard
 *   beyond 200%      10s          — flat; a client here is looping, not browsing
 *
 * There is deliberately no step beyond this. The curve has no rejection at the end of it.
 */
export function slowdownDelayMs(bucket: Bucket, used: number): number {
  const points = rateLimitConfig[bucket].points;
  const start = slowdownThreshold(bucket);
  if (used <= start) return 0;

  if (used <= points) {
    const span = Math.max(1, points - start);
    return Math.round(((used - start) / span) * SLOWDOWN_AT_LIMIT_MS);
  }

  const overSpan = Math.max(1, points * (SLOWDOWN_MAX_AT_MULTIPLE - 1));
  const over = Math.min(used - points, overSpan);
  return Math.round(SLOWDOWN_AT_LIMIT_MS + (over / overSpan) * (SLOWDOWN_MAX_MS - SLOWDOWN_AT_LIMIT_MS));
}

function createSpeedLimiter(bucket: Bucket) {
  // The test environment skips the wait. The delay is real time — a suite that drives a
  // bucket to its cap would spend minutes asleep, which makes the tests useless rather than
  // thorough. The curve itself is unit-tested through `slowdownDelayMs`.
  if (isTestEnv) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return slowDown({
    windowMs: rateLimitConfig[bucket].duration * 1000,
    delayAfter: slowdownThreshold(bucket),
    delayMs: (used: number) => slowdownDelayMs(bucket, used),
    maxDelayMs: SLOWDOWN_MAX_MS,
    keyGenerator: rateLimitKey,
    // Counted in shared Redis, not per-process memory. See RedisSlowDownStore for why that
    // distinction matters now that the ramp is doing the real work.
    store: new RedisSlowDownStore(bucket),
    // trust-proxy is configured centrally in app.ts (`trustProxyHops`); express-slow-down's
    // own check does not know that and would warn on every request.
    validate: {xForwardedForHeader: false},
  });
}

const speedLimiterDefault = createSpeedLimiter('default');
const speedLimiterSpecial = createSpeedLimiter('special');
const speedLimiterMedia = createSpeedLimiter('media');
// The auth bucket previously had no ramp at all: it relied on the hard 429 to stop a
// credential-stuffing run, with `loginSpeedLimiter` (a flat 1s after 10 attempts) as the only
// gradual layer. With nothing being refused any more, the ramp *is* the brute-force defence,
// so auth needs a real one. At the 150/min default the curve reaches 10s per attempt by
// 300/min, which puts a guessing run at six tries a minute — slower than the hard cap ever
// made it, because the hard cap let the attacker resume at full speed after 10s.
const speedLimiterAuth = createSpeedLimiter('auth');

const specialPaths = new Set([
  asPath('/userdata/proxy'),
  asPath('/userdata/proxyr'),
  asPath('/data/meta'),
  // /data/contentInfo is the modern replacement for /data/meta and /data/podcastFeedLookup
  // fetches an arbitrary feed after an iTunes lookup. Both make outbound requests on the
  // caller's behalf, so both belong in the tight bucket — they were falling through to the
  // 300/min default, which made the 30/min cap on /data/meta trivially avoidable by simply
  // calling its successor instead.
  asPath('/data/contentInfo'),
  asPath('/data/podcastFeedLookup'),
  asPath('/user/image/upload'),
  asPath('/userfile/upload'),
  asPath('/user/publicProfileImage/upload'),
]);
const mediaPaths = new Set([
  asPath('/userfile/get'),
  asPath('/content/post'),
  asPath('/pubfile/get'),
  asPath('/userfile/getById'),
  asPath('/image/get'),
]);
// Paths exempt from the global per-IP limiter. /sync/events is a long-lived SSE
// stream with its OWN per-clientId connect throttle (see sync.route.ts), which
// responds with a graceful `retry:` backoff. Running the per-IP limiter here
// fires a hard 429 *before* that throttle, which (a) never delivers the backoff
// hint a reconnecting client needs to calm down, and (b) drains the shared
// per-IP budget so normal API calls from the same NAT/IP (e.g. viewing posts)
// get collateral-429'd. A buggy reconnect storm thus took out unrelated reads.
const exemptPaths = new Set([asPath('/sync/events')]);

/**
 * Count the request and record heavy overuse in the ledger. **Always** calls `next()`.
 *
 * Every bucket funnels through here so a new limiter cannot be added without its overuse
 * landing in the ledger. What it does NOT do is refuse anything — see the note on
 * `BucketLimiters`. By the time a key gets here the slow-down ramp has already applied
 * whatever backpressure its volume earned, and that is the entire enforcement mechanism.
 *
 * The ledger call is fire-and-forget by design: `record` buffers in memory and never throws,
 * so a ledger problem cannot turn a served request into a 500.
 */
async function meterAndContinue(
  bucketLimiters: BucketLimiters,
  bucket: Bucket,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = rateLimitKey(req);

  try {
    await bucketLimiters.meter.consume(key);
  } catch (err: any) {
    // rate-limiter-flexible rejects with a RateLimiterRes (carrying `msBeforeNext`) when the
    // budget is spent, and with a real Error when the store itself failed. Only the first is
    // worth recording; a Redis blip is a store problem, not a caller problem.
    if (err && typeof err.msBeforeNext === 'number') {
      recordSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.RATELIMIT_EXCEEDED,
        severity: 'warn',
        ip: req.ip,
        route: req.path,
        clientId: (req as any).authInfo?.clientId || null,
        actorUserId: (req as any).authInfo?.userId || null,
        actorAccountId: (req as any).authInfo?.accountId || null,
        // `keyedBy` distinguishes "one signed-in account is generating a lot of traffic" from
        // "an unauthenticated address is", which warrant different attention.
        // `served: true` is the important field for anyone reading this ledger later: these
        // rows are observations, not refusals. Nothing was turned away.
        detail: {
          bucket,
          method: req.method,
          keyedBy: key.startsWith('u:') ? 'user' : 'ip',
          limit: bucketLimiters.points,
          served: true,
        },
      });
    } else {
      logger.error(`[ratelimit] '${bucket}' meter errored`, err);
    }
  }

  next();
}

/**
 * Run a slow-down layer as a promise, so the bucket dispatch below stays linear.
 *
 * Resolves `false` when the client went away mid-delay, and the caller must then stop.
 *
 * This is not defensive padding. express-slow-down implements its delay as
 * `setTimeout(() => next(), delay)` with `res.on('close', () => clearTimeout(timerId))` — so
 * if the connection closes while a request is waiting, `next` is **never called**. Awaiting
 * it unconditionally leaves a promise that can never settle, pinning `req` and `res` for the
 * life of the process. Raising the ceiling from 1s to 10s widened that window tenfold.
 */
export function applySpeedLimiter(
  speedLimiter: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      res.removeListener('close', onClose);
      resolve(completed);
    };
    const onClose = () => finish(false);

    res.once('close', onClose);
    speedLimiter(req, res, () => finish(true));
  });
}

// Middleware function
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Runtime kill switch — see services/rate_limit_switch.ts. Reads a cached boolean, so
  // this costs nothing per request, and can be flipped fleet-wide without a redeploy.
  if (!isRateLimitingEnabled()) {
    next();
    return;
  }

  if (exemptPaths.has(req.path)) {
    next();
    return;
  }

  // Slow down, then serve. There is no second step that refuses: the delay the request
  // already waited out IS the enforcement, and `meterAndContinue` only records what it saw.
  //
  // A false from the slow-down layer means the client hung up while waiting. Handing that to
  // the route would run the whole request — database work included — to write a response
  // nobody is listening for.
  if (specialPaths.has(req.path)) {
    if (!(await applySpeedLimiter(speedLimiterSpecial, req, res))) return;
    await meterAndContinue(buckets.special, 'special', req, res, next);
  } else if (mediaPaths.has(req.path)) {
    if (!(await applySpeedLimiter(speedLimiterMedia, req, res))) return;
    await meterAndContinue(buckets.media, 'media', req, res, next);
  } else {
    if (!(await applySpeedLimiter(speedLimiterDefault, req, res))) return;
    await meterAndContinue(buckets.default, 'default', req, res, next);
  }
};

export const rateLimitMiddlewareAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!isRateLimitingEnabled()) {
    next();
    return;
  }
  if (!(await applySpeedLimiter(speedLimiterAuth, req, res))) return;
  await meterAndContinue(buckets.auth, 'auth', req, res, next);
};
