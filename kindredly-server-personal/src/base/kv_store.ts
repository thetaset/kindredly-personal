/**
 * The key-value surface this codebase actually uses, extracted from the 88 call
 * sites across 12 files that used to talk to ioredis directly.
 *
 * Two halves, deliberately:
 *
 *   1. **ioredis-shaped commands.** `get`, `del(...keys)`, `smembers` and the
 *      rest keep ioredis's names and argument order, so the Redis implementation
 *      is pure delegation and not one call site had to move. Naming these for
 *      intent would have meant rewriting ~50 sites inside `sse.manager.ts` - 820
 *      lines on the real-time delivery path with no test of its own - to avoid
 *      writing the ~30-line pipeline builder below. That is a bad trade.
 *
 *   2. **Intent-named operations**, for the three forms that cannot be expressed
 *      1:1: the two lock primitives (a `SET NX PX` and the Lua compare-and-delete
 *      it needs to be safe) and `setIfAbsent`. These get names because their
 *      ioredis spelling is a trap - see `setIfAbsent`.
 *
 * `EVAL` is deliberately absent. Its single use was the lock release, which
 * `releaseLock` now owns, and it is the one genuinely Redis-specific construct
 * in the file set. Leaving it on the interface would let a future caller write
 * Lua that no other backend can run.
 *
 * Nothing here is durable. The SSE registry, the rate counters, the session
 * cache and the feed cache are all ephemeral by design, which is what makes an
 * in-memory implementation a real substitute rather than an approximation.
 */

/**
 * A batched command chain. Mirrors the slice of ioredis's `ChainableCommander`
 * this codebase uses, and exists so `sse.manager.ts`, `session.service.ts` and
 * `redis_slowdown_store.ts` keep their existing `.multi()` / `.pipeline()` shape.
 *
 * `exec()` returns ioredis's `[error, result][]` tuple array, because every
 * current caller already destructures exactly that (`results?.[i]?.[1]`).
 *
 * **`multi()` and `pipeline()` return the same thing here.** On Redis they
 * differ (MULTI is atomic, PIPELINE is only batched); in the in-memory
 * implementation there is one thread and one process, so the distinction has no
 * observable form. The one place real atomicity is load-bearing is the lock
 * release, which is `releaseLock`, not a pipeline.
 */
export interface KvPipeline {
  incr(key: string): this;
  pttl(key: string): this;
  expire(key: string, seconds: number): this;
  exists(key: string): this;
  del(...keys: string[]): this;
  srem(key: string, ...members: string[]): this;
  set(key: string, value: string, mode: 'EX', seconds: number): this;
  exec(): Promise<[Error | null, unknown][] | null>;
}

export interface KeyValueStore {
  // ---- strings -----------------------------------------------------------
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'PX', milliseconds: number): Promise<'OK' | null>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  mget(keys: string[]): Promise<(string | null)[]>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;

  // ---- keys --------------------------------------------------------------
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  /**
   * Only `prefix:*` patterns are supported. Every one of the 13 call sites uses
   * exactly that shape, and implementations throw on anything else rather than
   * quietly returning a wrong answer for a glob they did not really match.
   */
  keys(pattern: string): Promise<string[]>;

  // ---- sets --------------------------------------------------------------
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;

  // ---- batching ----------------------------------------------------------
  multi(): KvPipeline;
  pipeline(): KvPipeline;

  // ---- intent-named ------------------------------------------------------
  /**
   * Set only if the key is absent, with a TTL. Returns whether this caller won.
   *
   * Named rather than left as `set(k, v, 'EX', n, 'NX')` because that spelling
   * has already been a live trap here: ioredis takes the flags positionally, and
   * the node-redis option-object form (`{NX: true, EX: n}`) is accepted as an
   * ordinary argument and silently ignored - leaving the key with no expiry.
   * See the note at `services/security_digest.service.ts`, whose alert throttle
   * would have been suppressed forever.
   */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Take a single-flight lock, returning false if someone else holds it.
   * The caller supplies the token so it can prove ownership on release.
   */
  acquireLock(key: string, token: string, ttlMs: number): Promise<boolean>;

  /**
   * Release only if `token` still matches - a compare-and-delete, not a plain
   * delete. A holder that overran its TTL would otherwise delete its
   * successor's lock. On Redis this is the one operation that genuinely needs
   * to be atomic across processes.
   */
  releaseLock(key: string, token: string): Promise<void>;

  /** Drop any connections/resources. Idempotent. */
  close(): Promise<void>;
}

/** Thrown for a `keys()` pattern outside the supported `prefix:*` shape. */
export class UnsupportedKeyPatternError extends Error {
  constructor(pattern: string) {
    super(
      `keys() supports only 'prefix:*' patterns, got '${pattern}'. ` +
        `Add a narrower accessor rather than widening glob support - a partial ` +
        `glob implementation returns wrong answers silently.`,
    );
    this.name = 'UnsupportedKeyPatternError';
  }
}
