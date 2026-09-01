import {logger} from '@/utils/logger';
import {KeyValueStore, KvPipeline, UnsupportedKeyPatternError} from './kv_store';

/**
 * The `lite` implementation: one process, one Map, no Redis container.
 *
 * Three rules shape this file, and all three are load-bearing on a 2 GB board:
 *
 *   1. **It is bounded.** LITE-12 was a 342 MB leak caused by a queue that
 *      retained completed jobs forever. An unbounded in-memory KV is that same
 *      leak relocated into the Node heap, where it is worse - resident in the
 *      server process rather than in a container you can restart. Hence the
 *      entry cap and LRU eviction.
 *
 *   2. **It starts no timers.** Expiry is lazy on read plus a sweep on write.
 *      A `setInterval` inside a base module keeps the process alive, fires in
 *      every test run, and is its own leak vector - see the standing rule
 *      against background timers.
 *
 *   3. **It refuses what it cannot do faithfully.** `keys()` takes `prefix:*`
 *      and nothing else. A half-implemented glob returns wrong answers with no
 *      error, which is the failure mode this whole profile has to avoid.
 *
 * Redis's keyspace is flat - a key is a string or a set, never both - so one map
 * holds both and `del`/`exists`/`expire`/`keys` work uniformly, exactly as they
 * do on Redis.
 */

type Entry =
  | {kind: 'string'; value: string; expiresAt: number | null}
  | {kind: 'set'; members: Set<string>; expiresAt: number | null};

/** Above this many live keys, the oldest are evicted. */
const DEFAULT_MAX_ENTRIES = 50_000;
const EVICTION_WARN_INTERVAL_MS = 60_000;

class MemoryPipeline implements KvPipeline {
  private steps: Array<() => Promise<unknown>> = [];

  constructor(private store: InMemoryKeyValueStore) {}

  incr(key: string): this {
    this.steps.push(() => this.store.incr(key));
    return this;
  }
  pttl(key: string): this {
    this.steps.push(async () => this.store.pttl(key));
    return this;
  }
  expire(key: string, seconds: number): this {
    this.steps.push(() => this.store.expire(key, seconds));
    return this;
  }
  exists(key: string): this {
    this.steps.push(() => this.store.exists(key));
    return this;
  }
  del(...keys: string[]): this {
    this.steps.push(() => this.store.del(...keys));
    return this;
  }
  srem(key: string, ...members: string[]): this {
    this.steps.push(() => this.store.srem(key, ...members));
    return this;
  }
  set(key: string, value: string, mode: 'EX', seconds: number): this {
    this.steps.push(() => this.store.set(key, value, mode, seconds));
    return this;
  }

  async exec(): Promise<[Error | null, unknown][] | null> {
    const results: [Error | null, unknown][] = [];
    for (const step of this.steps) {
      try {
        results.push([null, await step()]);
      } catch (error: any) {
        // ioredis reports a per-command failure in the tuple rather than
        // rejecting exec(), and the callers read `results[i][1]`.
        results.push([error instanceof Error ? error : new Error(String(error)), null]);
      }
    }
    return results;
  }
}

export class InMemoryKeyValueStore implements KeyValueStore {
  private entries = new Map<string, Entry>();
  private lastEvictionWarnAt = 0;

  constructor(private maxEntries: number = DEFAULT_MAX_ENTRIES) {}

  // ---- internals ---------------------------------------------------------

  /** Read through expiry, refreshing LRU position. Undefined if absent or expired. */
  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Touch: Map iterates in insertion order, so re-inserting moves this key to
    // the young end and keeps eviction genuinely least-recently-used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  private write(key: string, entry: Entry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.enforceBound();
  }

  /**
   * Drop expired keys first, then the oldest live ones. Purging expired entries
   * before evicting live ones matters: a store full of stale TTL'd keys would
   * otherwise throw away good data and log a scary warning for no reason.
   */
  private enforceBound(): void {
    if (this.entries.size <= this.maxEntries) return;

    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) this.entries.delete(key);
    }
    if (this.entries.size <= this.maxEntries) return;

    let evicted = 0;
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) break;
      this.entries.delete(key);
      evicted++;
    }

    // Throttled: once the cap is reached every subsequent write evicts, so an
    // unthrottled line here turns a capacity problem into a log-volume problem.
    if (evicted > 0 && now - this.lastEvictionWarnAt >= EVICTION_WARN_INTERVAL_MS) {
      this.lastEvictionWarnAt = now;
      logger.warn(
        `[kv] in-memory store at its ${this.maxEntries}-key cap; evicted ${evicted} least-recently-used ` +
          `key(s). Everything here is ephemeral by design, but sustained eviction means something is ` +
          `writing keys faster than they expire.`,
      );
    }
  }

  private expiryFrom(mode: 'EX' | 'PX' | undefined, ttl: number | undefined): number | null {
    if (!mode || ttl === undefined) return null;
    return Date.now() + (mode === 'EX' ? ttl * 1000 : ttl);
  }

  // ---- strings -----------------------------------------------------------

  async get(key: string): Promise<string | null> {
    const entry = this.live(key);
    if (!entry || entry.kind !== 'string') return null;
    return entry.value;
  }

  set(key: string, value: string): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'PX', milliseconds: number): Promise<'OK' | null>;
  async set(key: string, value: string, mode?: 'EX' | 'PX', ttl?: number): Promise<'OK' | null> {
    this.write(key, {kind: 'string', value, expiresAt: this.expiryFrom(mode, ttl)});
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.write(key, {kind: 'string', value, expiresAt: Date.now() + seconds * 1000});
    return 'OK';
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async incr(key: string): Promise<number> {
    return this.addTo(key, 1);
  }

  async decr(key: string): Promise<number> {
    return this.addTo(key, -1);
  }

  /** INCR/DECR keep an existing TTL, as Redis does - the counter is not a new key. */
  private addTo(key: string, delta: number): number {
    const entry = this.live(key);
    if (entry && entry.kind !== 'string') throw new Error(`WRONGTYPE: ${key} is not a string`);
    const existing = entry?.kind === 'string' ? entry : undefined;
    const current = existing ? Number(existing.value) : 0;
    if (existing && !Number.isFinite(current)) throw new Error(`ERR value at ${key} is not an integer`);
    const next = current + delta;
    this.write(key, {kind: 'string', value: String(next), expiresAt: existing ? existing.expiresAt : null});
    return next;
  }

  // ---- keys --------------------------------------------------------------

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.live(key) !== undefined) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  async exists(...keys: string[]): Promise<number> {
    // Redis counts each argument, so a key named twice counts twice. Kept
    // faithful because `getUserConnectionCount` relies on the count.
    return keys.reduce((total, key) => total + (this.live(key) !== undefined ? 1 : 0), 0);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + milliseconds;
    return 1;
  }

  /** Milliseconds left, `-1` with no expiry, `-2` if absent. Redis's PTTL contract. */
  pttl(key: string): number {
    const entry = this.live(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  async keys(pattern: string): Promise<string[]> {
    if (!/^[^*?[\]]+\*$/.test(pattern)) throw new UnsupportedKeyPatternError(pattern);
    const prefix = pattern.slice(0, -1);
    const now = Date.now();
    const matched: string[] = [];
    for (const [key, entry] of this.entries) {
      if (!key.startsWith(prefix)) continue;
      if (entry.expiresAt !== null && entry.expiresAt <= now) continue;
      matched.push(key);
    }
    return matched;
  }

  // ---- sets --------------------------------------------------------------

  async sadd(key: string, ...members: string[]): Promise<number> {
    const entry = this.live(key);
    if (entry && entry.kind !== 'set') throw new Error(`WRONGTYPE: ${key} is not a set`);
    const existing = entry?.kind === 'set' ? entry : undefined;
    const set = existing ? existing.members : new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    this.write(key, {kind: 'set', members: set, expiresAt: existing ? existing.expiresAt : null});
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    if (entry.kind !== 'set') throw new Error(`WRONGTYPE: ${key} is not a set`);
    let removed = 0;
    for (const member of members) if (entry.members.delete(member)) removed++;
    // Redis drops a set key once it is empty, and callers count on the key
    // disappearing rather than lingering as an empty member list.
    if (entry.members.size === 0) this.entries.delete(key);
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const entry = this.live(key);
    if (!entry || entry.kind !== 'set') return [];
    return [...entry.members];
  }

  // ---- batching ----------------------------------------------------------

  multi(): KvPipeline {
    return new MemoryPipeline(this);
  }

  pipeline(): KvPipeline {
    return new MemoryPipeline(this);
  }

  // ---- intent-named ------------------------------------------------------

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.live(key) !== undefined) return false;
    this.write(key, {kind: 'string', value, expiresAt: Date.now() + ttlSeconds * 1000});
    return true;
  }

  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    if (this.live(key) !== undefined) return false;
    this.write(key, {kind: 'string', value: token, expiresAt: Date.now() + ttlMs});
    return true;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const entry = this.live(key);
    if (!entry || entry.kind !== 'string') return;
    if (entry.value !== token) return;
    this.entries.delete(key);
  }

  async close(): Promise<void> {
    this.entries.clear();
  }
}
