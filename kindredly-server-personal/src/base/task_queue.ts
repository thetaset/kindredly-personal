/**
 * Background work, from the caller's point of view.
 *
 * Three methods, because three is what the codebase actually uses - the
 * enqueue/waitUntilFinished/Job.fromId dance was written out twice
 * (`task_runner.service.ts` and `internal_published.service.ts`) with different
 * TTLs, and a fire-and-forget add once more in the moderation reporter.
 *
 * In `cloud` this is BullMQ over Redis, with a separate task-server process
 * running the worker. In `lite` there is no second process and no Redis, so the
 * work runs inline. That difference is invisible here on purpose: a caller that
 * could tell them apart would be a caller that breaks on the appliance.
 */
/**
 * Per-job options. Exactly what the one fire-and-forget caller needs and nothing
 * more - `published_moderation_reporter.service.ts`, which dedupes by publishId
 * and retries twice. Carried on the interface rather than dropped, because
 * silently losing a dedupe key would let one publish queue an unbounded number
 * of AI review jobs.
 */
export type EnqueueOptions = {
  /** A job already queued under this id is not queued again. */
  dedupeKey?: string;
  /** Total attempts including the first. */
  attempts?: number;
  /** Base delay for exponential backoff between attempts. */
  backoffMs?: number;
  /** Drop the record the instant it finishes, instead of keeping the retention window. */
  retainNothing?: boolean;
};

export interface TaskQueue {
  /**
   * Enqueue and wait for the result.
   *
   * `ttlMs` bounds the wait, and the clock starts at ENQUEUE - it covers queue
   * wait as well as execution. See `TASK_WAIT_TTL_MS` for why that matters.
   */
  runTask(name: string, data: object, ttlMs?: number): Promise<unknown>;

  /**
   * Enqueue and return without waiting for the result.
   *
   * The job's own result and its handler's errors are discarded - a handler
   * failure is logged where the job runs, not raised here. Rejecting the
   * *enqueue* is different and does happen: an unreachable queue fails this
   * call, and the one caller catches it rather than failing the request that
   * triggered it.
   */
  enqueue(name: string, data: object, options?: EnqueueOptions): Promise<void>;

  /** Release connections. Idempotent. */
  close(): Promise<void>;
}
