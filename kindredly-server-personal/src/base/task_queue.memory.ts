import {EnqueueOptions, TaskQueue} from './task_queue';
import {runJob} from './task_dispatch';
import {logger} from '@/utils/logger';

/**
 * The `lite` queue: run it here, now, and keep nothing.
 *
 * **Retaining nothing is the requirement, not an optimisation.** LITE-12 was a
 * 342 MB leak caused by BullMQ keeping completed jobs forever. An in-process
 * queue that held completed jobs "for status" would move that leak from Redis
 * into the Node heap on a 2 GB board, which is strictly worse - it is resident
 * in the server process and survives until the process dies. So: no job records,
 * no completed list, not even a bounded ring. Run, return, forget.
 *
 * There is no worker pool and no concurrency limit because there is no queue to
 * be head-of-line blocked. `runTask` is already awaited by its caller, so the
 * work is bounded by in-flight requests exactly as any other request work is.
 *
 * `ttlMs` is accepted and ignored: it exists to bound a wait for another
 * process, and there is no other process. A caller's own request timeout is the
 * real bound here.
 */
export class InMemoryTaskQueue implements TaskQueue {
  /**
   * Dedupe keys currently running. The only bounded state this class keeps, and
   * it is bounded by concurrency rather than by history - an entry exists only
   * while its job is in flight.
   */
  private inFlight = new Set<string>();

  async runTask(name: string, data: object, _ttlMs?: number): Promise<unknown> {
    return await runJob(name, data);
  }

  async enqueue(name: string, data: object, options?: EnqueueOptions): Promise<void> {
    const key = options?.dedupeKey;
    if (key) {
      if (this.inFlight.has(key)) return;
      this.inFlight.add(key);
    }

    // NOT awaited. `enqueue` promises the caller it returns without waiting for
    // the result, and under `cloud` BullMQ returns as soon as the job is
    // queued. Awaiting here would make the same call block for the job's whole
    // duration on the appliance - a multi-minute retention purge would turn the
    // request that triggered it into a timeout.
    //
    // The `.catch` is what makes floating it safe: `runJob` already swallows
    // handler errors, so this only fires if dispatch itself throws, and an
    // unhandled rejection would take down a single-process box.
    //
    // `attempts` and `backoffMs` are ignored: retrying with exponential backoff
    // needs a scheduler that outlives the call, which is exactly the background
    // timer this profile must not start. The only caller that sets them queues
    // an AI moderation review, and AI is out of scope for this tier.
    void runJob(name, data)
      .catch((error) => logger.error(`[queue] job '${name}' failed to dispatch`, error))
      .finally(() => {
        if (key) this.inFlight.delete(key);
      });
  }

  async close(): Promise<void> {
    this.inFlight.clear();
  }
}
