import {config} from '@/config';
import {KeyValueStore} from './kv_store';
import {EventBus} from './event_bus';
import {TaskQueue} from './task_queue';

/**
 * Picks the KV store, event bus and task queue for this process's profile.
 *
 * Shaped after `base/fileaccess.factory.ts` - the config-driven factory this
 * codebase already knows how to write - with one addition that matters:
 * **everything resolves on first call, never at module load.**
 *
 * That laziness is the whole correctness argument. Services capture their store
 * as a constructor-parameter default (`client_info.service.ts`,
 * `live_view.service.ts`) or a class field (`passkey.service.ts`), which runs at
 * construction; and the old `taskqueue_instances.ts` built a BullMQ `Queue` at
 * import. Resolving eagerly here would reintroduce exactly that: a Redis socket
 * opened during module resolution, in a process that may have no Redis. Get this
 * wrong and the profile silently has no effect while appearing to work.
 *
 * The implementations are `require`d rather than imported for the same reason -
 * importing `kv_store.redis.ts` pulls in `ioredis` even when the answer is going
 * to be the in-memory store.
 */

let kvStore: KeyValueStore | null = null;
let eventBus: EventBus | null = null;
let taskQueue: TaskQueue | null = null;

const isLite = () => config.profile === 'lite';

export function getKeyValueStore(): KeyValueStore {
  if (!kvStore) {
    if (isLite()) {
      const {InMemoryKeyValueStore} = require('./kv_store.memory');
      kvStore = new InMemoryKeyValueStore();
    } else {
      const {RedisKeyValueStore} = require('./kv_store.redis');
      kvStore = new RedisKeyValueStore();
    }
  }
  return kvStore as KeyValueStore;
}

export function getEventBus(): EventBus {
  if (!eventBus) {
    if (isLite()) {
      const {InMemoryEventBus} = require('./event_bus.memory');
      eventBus = new InMemoryEventBus();
    } else {
      const {RedisEventBus} = require('./event_bus.redis');
      eventBus = new RedisEventBus();
    }
  }
  return eventBus as EventBus;
}

export function getTaskQueue(): TaskQueue {
  if (!taskQueue) {
    if (isLite()) {
      const {InMemoryTaskQueue} = require('./task_queue.memory');
      taskQueue = new InMemoryTaskQueue();
    } else {
      const {BullMqTaskQueue} = require('./task_queue.bullmq');
      taskQueue = new BullMqTaskQueue();
    }
  }
  return taskQueue as TaskQueue;
}

/**
 * Close whatever was actually built and forget it, so the next call re-resolves.
 * Only what was constructed is touched - asking for a store here purely to close
 * it would open the connection this is trying to close.
 */
export async function closeRuntime(): Promise<void> {
  const closing = [kvStore?.close(), eventBus?.close(), taskQueue?.close()].filter(Boolean);
  kvStore = null;
  eventBus = null;
  taskQueue = null;
  await Promise.allSettled(closing);
}
