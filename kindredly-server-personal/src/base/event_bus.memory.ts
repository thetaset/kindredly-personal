import {EventBus} from './event_bus';
import {logger} from '@/utils/logger';

/**
 * In-process fan-out for `lite`.
 *
 * A plain map of channel -> handlers rather than a Node `EventEmitter`, for one
 * reason: EventEmitter warns at 10 listeners on a channel and this has no upper
 * bound by design. Delivery is synchronous within the publish call, which
 * matches Redis closely enough for the one consumer - `sse.manager` publishes
 * and does not wait for or observe delivery.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Array<(message: string) => void>>();

  async publish(channel: string, message: string): Promise<void> {
    for (const handler of this.handlers.get(channel) || []) {
      try {
        handler(message);
      } catch (error) {
        // Matches the Redis bus: one bad handler must not stop the others, and
        // must not fail the publisher, which never awaits delivery anyway.
        logger.error(`[eventbus] handler for '${channel}' threw`, error);
      }
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    const existing = this.handlers.get(channel);
    if (existing) existing.push(handler);
    else this.handlers.set(channel, [handler]);
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}
