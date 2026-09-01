import {config} from '@/config';
import {TaskRunnerJobTypes} from '@/typing/enum_strings';
import {getTaskQueue} from './runtime.factory';
import {logger} from '@/utils/logger';

/**
 * What runs on a schedule, and which profiles run it.
 *
 * **One table, two schedulers.** Under `cloud` the separate task-server process
 * registers these as BullMQ repeatables (`task_runner.ts`). Under `lite` there is
 * no second process and no Redis, so `startRecurringJobs()` below drives them
 * from plain timers in the web process. Both read this table.
 *
 * Sharing it is the same argument that produced `task_dispatch.ts`: two copies of
 * a job list drift, and the drift is silent. There the failure was a job type
 * handled in one profile and ignored in the other; here it would be an appliance
 * purging data on a different cadence than the cloud, which nobody would notice
 * until a privacy question got the wrong answer.
 */
export type RecurringJob = {
  job: TaskRunnerJobTypes;
  everyMs: number;
  /** Fire once at registration as well as on the interval. BullMQ only - see startRecurringJobs. */
  immediately: boolean;
  /** Profiles that run this job at all. */
  profiles: readonly ('cloud' | 'lite')[];
};

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;

export const RECURRING_JOBS: readonly RecurringJob[] = [
  {
    // `_internal` only. A box has no publishing catalog, so it has nothing to
    // auto-publish - this is the one repeatable a `lite` appliance deliberately
    // never runs, rather than one that was overlooked.
    job: TaskRunnerJobTypes.runAutoPublish,
    everyMs: 67 * MINUTE,
    immediately: true,
    profiles: ['cloud'],
  },
  {
    job: TaskRunnerJobTypes.runDataRetention,
    everyMs: 24 * HOUR,
    immediately: false,
    profiles: ['cloud', 'lite'],
  },
  {
    // Companion/Guard tamper watch. 30 minutes is fine even though the alert
    // thresholds are 12h/48h: the cadence only has to be tight enough to land
    // inside the one-hour local digest window.
    job: TaskRunnerJobTypes.runCompanionTamperWatch,
    everyMs: 30 * MINUTE,
    immediately: false,
    profiles: ['cloud', 'lite'],
  },
  {
    // The security digest. Hourly because that is the window the thresholds are
    // written against - running it more often would evaluate a partial window
    // against whole-window numbers and never fire; running it less often delays
    // every alert by the difference.
    job: TaskRunnerJobTypes.runSecurityDigest,
    everyMs: HOUR,
    immediately: false,
    profiles: ['cloud', 'lite'],
  },
];

export const liteRecurringJobs = () => RECURRING_JOBS.filter((j) => j.profiles.includes('lite'));
export const cloudRecurringJobs = () => RECURRING_JOBS.filter((j) => j.profiles.includes('cloud'));

/** Live timers, so a second start is a no-op and a stop can actually stop. */
let timers: NodeJS.Timeout[] = [];

/**
 * Start the `lite` profile's recurring work in this process.
 *
 * **Call this from the boot seam, never from module load.** A base module that
 * starts a timer on import starts it in every process that touches the module -
 * including jest workers and the migration CLI - and a timer that keeps the
 * event loop alive is its own problem. `app.ts#listen()` is the one place that
 * means "this process is serving requests"; integration tests build the app
 * through `getServer()` and never reach it.
 *
 * **`cloud` must start nothing.** The task-server already registers these as
 * BullMQ repeatables. If the web process also started them, every job would run
 * twice - a doubled retention purge and a doubled digest, invisible until
 * someone compared alert counts against the schedule.
 */
export function startRecurringJobs(): void {
  if (config.profile !== 'lite') return;

  // A timer in a jest worker outlives the test that made it and fires against
  // torn-down mocks. Same early return as `sse.manager.ts`.
  if (process.env.NODE_ENV === 'test') return;

  if (timers.length) return;

  for (const {job, everyMs} of liteRecurringJobs()) {
    // `enqueue`, not `runJob`: it is the profile-selected queue, so this stays
    // correct if the box ever gets a real one, and the in-process queue's
    // dedupe already prevents a slow run from overlapping the next tick.
    //
    // NOT awaited and NOT run immediately - `immediately` is a BullMQ
    // registration concept, and the three lite jobs all set it false, so
    // matching cloud means waiting out the first interval.
    const timer = setInterval(() => {
      getTaskQueue()
        .enqueue(job, {}, {dedupeKey: job})
        .catch((error) => logger.error(`[recurring] failed to enqueue '${job}'`, error));
    }, everyMs);

    // Without unref() these three timers alone would keep a box's event loop
    // alive forever, so nothing could ever shut down cleanly.
    timer.unref?.();
    timers.push(timer);
  }

  logger.info(`[recurring] lite scheduler started (${timers.length} jobs)`);
}

/** Stop and forget every timer. Idempotent; used by tests and clean shutdown. */
export function stopRecurringJobs(): void {
  for (const timer of timers) clearInterval(timer);
  timers = [];
}
