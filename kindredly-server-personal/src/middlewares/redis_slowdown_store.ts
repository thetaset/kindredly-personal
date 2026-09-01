import type {Store, Options, ClientRateLimitInfo} from 'express-rate-limit';
import {getKeyValueStore} from '@/base/runtime.factory';
import {logger} from '@/utils/logger';

/**
 * A shared-Redis counter for `express-slow-down`.
 *
 * express-slow-down defaults to an in-memory store, which gives every process its own
 * private count. ECS runs 2-8 tasks, so a ramp configured to begin at 225 requests/min
 * really began somewhere between 450 and 1800 — and the threshold rose as autoscaling added
 * tasks, which is backwards: the cushion got weaker exactly when it was most needed.
 *
 * That was tolerable while the ramp was only a cushion in front of a hard cap. It is not
 * tolerable now that the ramp is the primary mechanism and the 429 is a distant backstop: if
 * the delay never engages, nothing engages until the backstop, and the backstop is 10x away.
 *
 * Written against the ioredis singleton rather than adding `rate-limit-redis`, because the
 * whole contract is four small methods over a counter we already have a client for.
 *
 * Failure behaviour is **fail-open**: if Redis cannot be reached this reports a single hit,
 * so the ramp adds no delay. A counter outage must not become a latency incident, and the
 * hard limiter above still has its own in-memory insurance limiter.
 */
export class RedisSlowDownStore implements Store {
  /** Keys are shared across processes, so express-rate-limit must not assume otherwise. */
  localKeys = false;

  /**
   * Per-bucket namespace. Not decoration — express-rate-limit's `singleCount` validator
   * identifies a non-local store by its CONSTRUCTOR NAME plus this prefix, and throws
   * ERR_ERL_DOUBLE_COUNT if the same request increments the same identity twice. An /auth
   * request passes through two of these layers (the global one in `rateLimitMiddleware` and
   * the auth one in `rateLimitMiddlewareAuth`), so without a distinct prefix per bucket every
   * signin would 500.
   */
  readonly prefix: string;

  private static readonly WARN_INTERVAL_MS = 60_000;

  private windowMs = 60_000;
  private lastWarnAt = 0;

  constructor(bucket: string) {
    this.prefix = `sd_${bucket}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return this.prefix + key;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.key(key);
    try {
      const client = getKeyValueStore();

      // INCR and read the TTL in one round trip.
      //
      // Deliberately NOT `PEXPIRE key ms NX`, which would do this in a single command: the NX
      // flag needs Redis 7.0+. Production is 7.0.7 but the local Docker Redis is older, and a
      // version-dependent command fails in exactly the worst way here — the store falls open,
      // no delay is ever applied, and the ramp looks like it works while doing nothing.
      const [[, hits], [, ttl]] = (await client.multi().incr(redisKey).pttl(redisKey).exec()) as [unknown, number][];

      const totalHits = Number(hits) || 1;
      let remainingMs = Number(ttl);

      // A brand-new key has no expiry (PTTL -1). Set the window from the FIRST request rather
      // than refreshing it on every hit: a sliding window would keep a steadily-busy client
      // permanently inside the delayed band, never letting it reset.
      if (!(remainingMs > 0)) {
        await client.pexpire(redisKey, this.windowMs);
        remainingMs = this.windowMs;
      }

      return {totalHits, resetTime: new Date(Date.now() + remainingMs)};
    } catch (error: any) {
      this.warnThrottled(error);
      return {totalHits: 1, resetTime: new Date(Date.now() + this.windowMs)};
    }
  }

  /**
   * Log the fail-open condition at most once a minute per bucket.
   *
   * A Redis outage means EVERY request takes this path. Logging each one turns a store
   * problem into a log-volume problem and buries whatever else is happening — precisely when
   * the logs are being read. The condition is continuous, so one line a minute conveys it.
   */
  private warnThrottled(error: any): void {
    const now = Date.now();
    if (now - this.lastWarnAt < RedisSlowDownStore.WARN_INTERVAL_MS) return;
    this.lastWarnAt = now;
    logger.warn(
      `[slowdown] Redis counter unavailable for '${this.prefix}', not delaying (further ` +
        `occurrences suppressed for ${RedisSlowDownStore.WARN_INTERVAL_MS / 1000}s): ` +
        `${error?.message || error}`,
    );
  }

  async decrement(key: string): Promise<void> {
    try {
      await getKeyValueStore().decr(this.key(key));
    } catch {
      // A lost decrement only over-counts one request. Not worth surfacing.
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await getKeyValueStore().del(this.key(key));
    } catch {
      // Only reachable from admin tooling; the key expires on its own regardless.
    }
  }
}
