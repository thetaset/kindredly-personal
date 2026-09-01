import Redis from 'ioredis';
import {config} from '@/config';
import {logger} from '@/utils/logger';

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Shared Redis client factory to avoid creating multiple connections
 * across different services. IORedis clients are designed to be shared
 * and reused, as they maintain internal connection pooling.
 */
class RedisClientFactory {
  private static instance: RedisClientFactory;
  private client: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisClientFactory {
    if (!RedisClientFactory.instance) {
      RedisClientFactory.instance = new RedisClientFactory();
    }
    return RedisClientFactory.instance;
  }

  /**
   * Get the shared Redis client instance. Safe to call multiple times.
   * The same client can be used across different services.
   */
  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port as number,
        maxRetriesPerRequest: isTestEnv ? 0 : 3,
        retryStrategy: (times) => {
          if (isTestEnv) return null;
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: isTestEnv,
      });

      this.client.on('connect', () => {
        if (isTestEnv) return;
        logger.info('Redis client connected');
      });

      this.client.on('error', (err) => {
        if (isTestEnv) return;
        logger.error('Redis client error:', err);
      });

      this.client.on('close', () => {
        if (isTestEnv) return;
        logger.warn('Redis client connection closed');
      });

      this.client.on('reconnecting', () => {
        if (isTestEnv) return;
        logger.info('Redis client reconnecting...');
      });
    }

    return this.client;
  }

  /**
   * Create a new dedicated Redis client for pub/sub operations.
   * Pub/sub requires dedicated connections that don't handle other commands.
   */
  public createPubSubClient(): Redis {
    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port as number,
      maxRetriesPerRequest: isTestEnv ? 0 : null, // Pub/sub clients should not have max retries
      retryStrategy: (times) => {
        if (isTestEnv) return null;
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: isTestEnv,
    });

    client.on('error', (err) => {
      if (isTestEnv) return;
      logger.error('Redis pub/sub client error:', err);
    });

    return client;
  }

  /**
   * Gracefully close all connections
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        await this.client.disconnect();
      }
      this.client = null;
      logger.info('Redis client disconnected');
    }
  }
}

/**
 * The raw ioredis client - an escape hatch, not the general accessor.
 *
 * This used to be `getRedisClient()` and was called from 12 files. It is now
 * named to be loud and greppable, because reaching for it opts a call site out
 * of the `lite` profile entirely: on an appliance there is no Redis to return.
 *
 * Two legitimate callers, both cloud-only:
 *   - `middlewares/ratelimiting.middleware.ts` hands the client to
 *     `rate-limiter-flexible` as its `storeClient`, which wants a real ioredis
 *     and nothing else. That file is already withheld from self-hosted builds
 *     (`scripts/personal-sync/server-src.exclude`), so `lite` uses
 *     `RateLimiterMemory` there instead. A clean split.
 *   - `services/_internal/internal_published.service.ts`, which a box never runs.
 *
 * Everything else goes through `getKeyValueStore()` in `base/runtime.factory.ts`.
 */
export const requireIoRedis = () => RedisClientFactory.getInstance().getClient();

/**
 * A dedicated connection for pub/sub, which cannot share a client with ordinary
 * commands. Consumed only by the Redis `EventBus` implementation.
 */
export const createRedisPubSubClient = () => RedisClientFactory.getInstance().createPubSubClient();

export const disconnectRedis = () => RedisClientFactory.getInstance().disconnect();
