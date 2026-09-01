import {getTaskQueue} from '@/base/runtime.factory';

// Without a ttl, waitUntilFinished registers per-jobId listeners on the shared
// QueueEvents that are only removed when the job completes or fails — a job
// stranded by a task-runner restart pins the listeners, the pending promise,
// and the whole suspended request frame forever, silently (per-jobId event
// names never trip MaxListenersExceededWarning).
//
// The ttl clock starts at enqueue, so it covers QUEUE WAIT as well as
// execution. MainAsyncProc also carries multi-minute jobs (subscription
// imports, auto-publish, retention purges), so a tight bound here fails
// healthy foreground requests that are merely queued behind one of those —
// /data/meta and /data/classifyContentType 500 while their job goes on to
// succeed. Sized for wait+run, not run alone; the leak guard is the ttl
// existing at all, not it being short.
export const TASK_WAIT_TTL_MS = 300_000;

/**
 * The foreground caller's view of background work.
 *
 * Kept as a class with the same shape it has always had, because
 * `external_data.service.ts` constructs one as a field default. All it does now
 * is supply the default ttl and hand off to whichever queue the profile
 * resolved — BullMQ in `cloud`, in-process in `lite`.
 */
class TaskRunnerService {
  /**
   * `T` defaults to `any` to preserve what this method has always returned:
   * BullMQ's `returnvalue` is `any`, and callers like
   * `runContentClassificationTaskRunner` declare a concrete return type and let
   * it coerce. That coercion is unchecked either way - a job could return
   * anything - so the default names what was already happening rather than
   * scattering casts across the call sites. Pass `T` explicitly where the shape
   * matters and you want it stated.
   */
  async runTask<T = any>(name: string, data: {}, ttlMs: number = TASK_WAIT_TTL_MS): Promise<T> {
    return (await getTaskQueue().runTask(name, data, ttlMs)) as T;
  }
}

export default TaskRunnerService;
