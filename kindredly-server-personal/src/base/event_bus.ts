/**
 * Fan-out between server processes.
 *
 * One consumer today: `services/sse.manager.ts`, which broadcasts an SSE message
 * on a channel so that whichever process holds a given client's socket can write
 * to it. That is the entire requirement - a fire-and-forget string on a named
 * channel, with no delivery guarantee, no ordering guarantee and no replay.
 *
 * Which is why `lite` can satisfy it with an EventEmitter: on an appliance there
 * is exactly one process, so "tell the other processes" and "tell myself" are
 * the same operation. In `cloud` it is Redis pub/sub across pm2's two instances.
 */
export interface EventBus {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
  close(): Promise<void>;
}
