import type Redis from 'ioredis';
import type {ChainableCommander} from 'ioredis';
import {disconnectRedis, requireIoRedis} from './redis_client';
import {KeyValueStore, KvPipeline, UnsupportedKeyPatternError} from './kv_store';

/**
 * The production implementation: a thin, explicit delegation to the shared
 * ioredis singleton.
 *
 * Written as delegation rather than by declaring the interface structurally
 * satisfied by `Redis` and returning the client directly. ioredis's real
 * signatures are a deep pile of overloads, and relying on structural
 * assignability makes every future interface edit a fight with them. Forty
 * lines of forwarding buys a signature list this codebase controls, and the
 * generated JS is a straight call through.
 *
 * Every method is byte-identical in behaviour to what the call sites did before
 * the seam existed - that is the whole contract of this file.
 */
class RedisPipeline implements KvPipeline {
  constructor(private chain: ChainableCommander) {}

  incr(key: string): this {
    this.chain.incr(key);
    return this;
  }
  pttl(key: string): this {
    this.chain.pttl(key);
    return this;
  }
  expire(key: string, seconds: number): this {
    this.chain.expire(key, seconds);
    return this;
  }
  exists(key: string): this {
    this.chain.exists(key);
    return this;
  }
  del(...keys: string[]): this {
    this.chain.del(...keys);
    return this;
  }
  srem(key: string, ...members: string[]): this {
    this.chain.srem(key, ...members);
    return this;
  }
  set(key: string, value: string, mode: 'EX', seconds: number): this {
    this.chain.set(key, value, mode, seconds);
    return this;
  }
  exec(): Promise<[Error | null, unknown][] | null> {
    return this.chain.exec() as Promise<[Error | null, unknown][] | null>;
  }
}

export class RedisKeyValueStore implements KeyValueStore {
  private get client(): Redis {
    return requireIoRedis();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(key: string, value: string): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK' | null>;
  set(key: string, value: string, mode: 'PX', milliseconds: number): Promise<'OK' | null>;
  set(key: string, value: string, mode?: 'EX' | 'PX', ttl?: number): Promise<'OK' | null> {
    if (!mode) return this.client.set(key, value) as Promise<'OK' | null>;
    return this.client.set(key, value, mode as 'EX', ttl as number) as Promise<'OK' | null>;
  }

  setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value) as Promise<'OK'>;
  }

  mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return Promise.resolve([]);
    return this.client.mget(keys);
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return Promise.resolve(0);
    return this.client.del(...keys);
  }

  exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) return Promise.resolve(0);
    return this.client.exists(...keys);
  }

  expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  pexpire(key: string, milliseconds: number): Promise<number> {
    return this.client.pexpire(key, milliseconds);
  }

  keys(pattern: string): Promise<string[]> {
    // Validated even on Redis, which would happily run any glob: the two
    // backends must accept exactly the same inputs, or a pattern works in
    // production and throws on the appliance.
    if (!/^[^*?[\]]+\*$/.test(pattern)) throw new UnsupportedKeyPatternError(pattern);
    return this.client.keys(pattern);
  }

  sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  multi(): KvPipeline {
    return new RedisPipeline(this.client.multi());
  }

  pipeline(): KvPipeline {
    return new RedisPipeline(this.client.pipeline());
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    // Positional flags, not an option object. See the note on the interface.
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result !== null;
  }

  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<void> {
    // Compare-and-delete. A plain DEL would let a holder that overran its TTL
    // delete whoever holds the lock now.
    await this.client.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      1,
      key,
      token,
    );
  }

  async close(): Promise<void> {
    await disconnectRedis();
  }
}
