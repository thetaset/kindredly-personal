import {Job, Queue, QueueEvents, RedisOptions} from 'bullmq';
import {config} from '@/config';
import {EnqueueOptions, TaskQueue} from './task_queue';

/**
 * The `cloud` queue: BullMQ on Redis, worked by the separate task-server.
 *
 * **Everything here is lazy.** This file replaced `base/taskqueue_instances.ts`,
 * which built its `Queue` and `QueueEvents` at MODULE LOAD - and that eager
 * construction is precisely what pinned a Redis connection at boot, before any
 * profile could be resolved. A `lite` process that merely imported a service
 * which imported that module would have opened a Redis socket while believing
 * it had no Redis. Construct on first use, never at import.
 */

// Completed/failed jobs are retained by COUNT, never unbounded and never `true`.
//
// Unbounded is what leaked: a dev Redis was found holding 192,612 completed jobs
// spanning Feb 2025 - Aug 2026, 342MB of the container's 438MB, with maxmemory
// unset. BullMQ keeps completed jobs forever unless told otherwise.
//
// `true` (remove immediately) would be worse than the leak: runTask below awaits
// waitUntilFinished and THEN reads the job back via Job.fromId to get
// returnvalue, as does internal_published.service.ts. Removing on completion
// deletes the row before that read, so every task would return undefined. A
// count window keeps recent history for that read and for debugging, and still
// bounds growth.
const defaultJobOptions = {
  removeOnComplete: {count: 1000},
  removeOnFail: {count: 5000},
};

export class BullMqTaskQueue implements TaskQueue {
  private queue: Queue | null = null;
  private events: QueueEvents | null = null;

  private connection(): RedisOptions {
    return {host: config.redis.host, port: config.redis.port as number};
  }

  private getQueue(): Queue {
    if (!this.queue) {
      this.queue = new Queue('MainAsyncProc', {connection: this.connection(), defaultJobOptions});
    }
    return this.queue;
  }

  private getEvents(): QueueEvents {
    if (!this.events) {
      this.events = new QueueEvents('MainAsyncProc', {connection: this.connection()});
    }
    return this.events;
  }

  async runTask(name: string, data: object, ttlMs?: number): Promise<unknown> {
    const queue = this.getQueue();
    const job = await queue.add(name, data);
    await job.waitUntilFinished(this.getEvents(), ttlMs);

    // Read the job back rather than using waitUntilFinished's return: this is
    // the read that `removeOnComplete: true` would break.
    const result = await Job.fromId(queue, job.id as string);
    return result?.returnvalue;
  }

  async enqueue(name: string, data: object, options?: EnqueueOptions): Promise<void> {
    await this.getQueue().add(name, data, {
      ...(options?.dedupeKey ? {jobId: options.dedupeKey} : {}),
      ...(options?.attempts ? {attempts: options.attempts} : {}),
      ...(options?.backoffMs ? {backoff: {type: 'exponential' as const, delay: options.backoffMs}} : {}),
      // Only override the count-bounded defaults when the caller explicitly
      // wants nothing kept. Passing `undefined` here would not inherit them.
      ...(options?.retainNothing ? {removeOnComplete: true, removeOnFail: true} : {}),
    });
  }

  async close(): Promise<void> {
    const closing = [this.events?.close(), this.queue?.close()].filter(Boolean);
    this.events = null;
    this.queue = null;
    await Promise.allSettled(closing);
  }
}
