import type Redis from 'ioredis';
import {createRedisPubSubClient} from './redis_client';
import {EventBus} from './event_bus';
import {logger} from '@/utils/logger';

/**
 * Redis pub/sub across processes. Two dedicated connections, exactly as
 * `sse.manager.ts` created for itself before this seam existed: a client in
 * subscriber mode cannot issue ordinary commands, so publish and subscribe
 * cannot share one.
 *
 * Both are created lazily. Constructing this class must not open a socket -
 * the factory builds it during module resolution in some import orders, and an
 * eager connection there is exactly the boot-time Redis pin this profile work
 * exists to remove.
 */
export class RedisEventBus implements EventBus {
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private handlers = new Map<string, Array<(message: string) => void>>();

  private pub(): Redis {
    if (!this.pubClient) this.pubClient = createRedisPubSubClient();
    return this.pubClient;
  }

  private sub(): Redis {
    if (!this.subClient) {
      this.subClient = createRedisPubSubClient();
      this.subClient.on('message', (channel: string, message: string) => {
        for (const handler of this.handlers.get(channel) || []) {
          try {
            handler(message);
          } catch (error) {
            // One bad handler must not stop the others on the same channel.
            logger.error(`[eventbus] handler for '${channel}' threw`, error);
          }
        }
      });
    }
    return this.subClient;
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.pub().publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    const existing = this.handlers.get(channel);
    if (existing) {
      // Already subscribed on the wire; just add the listener.
      existing.push(handler);
      return;
    }
    this.handlers.set(channel, [handler]);
    await this.sub().subscribe(channel);
  }

  async close(): Promise<void> {
    const clients = [this.pubClient, this.subClient].filter(Boolean) as Redis[];
    this.pubClient = null;
    this.subClient = null;
    this.handlers.clear();
    await Promise.allSettled(clients.map((client) => client.quit()));
  }
}
