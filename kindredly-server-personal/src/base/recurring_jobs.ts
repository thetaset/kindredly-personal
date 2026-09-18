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
    // Curation review (docs/specs/curation-review.md): opens reviews that are due, and a few for
    // curated items never reviewed. `_internal` only, like runAutoPublish: a box has no catalog.
    // Six hours is often enough: it opens at most five a run and stops while fifteen are waiting.
    job: TaskRunnerJobTypes.runDueCurationReviews,
    everyMs: 6 * HOUR,
    immediately: false,
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
    // The realm backup. Daily, because the decision doc's availability story states RPO = the
    // backup interval and a family losing at most a day of changes is the trade being offered.
    //
    // Runs in both profiles even though the box is the customer: the service no-ops when
    // KND_BACKUP_TARGET is unset, which is the cloud default, so this does not pre-empt the
    // still-open question of whether cloud-hosted families get an export at all.
    job: TaskRunnerJobTypes.runRealmBackup,
    everyMs: 24 * HOUR,
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

/**
 * Where a job's last run is remembered across reboots (REALM-9).
 *
 * An interface rather than a direct repo call so the scheduler's own tests can drive it with fake
 * timers and no database — the property under test is "when does this fire", and a real table
 * would only make that slower and flakier.
 */
export type JobRunStore = {
  /** Epoch millis of the last recorded run, or null if this job has never run on this host. */
  lastRunAt(job: string): Promise<number | null>;
  recordRun(job: string, at: number): Promise<void>;
};

/** `sys_info` is classified `host` in `realm_scope.ts`, so none of this travels in a bundle. */
export const jobRunStateId = (job: string) => `recurring_last_run_${job}`;

/**
 * The real store. Built lazily so importing this module does not pull knex into a unit test that
 * has no use for it.
 */
function sysInfoJobRunStore(): JobRunStore {
  // RELATIVE, not `@/db/sysinfo.repo`, and it must stay that way. swc rewrites
  // `@/` aliases in top-level import statements but NOT inside a require() in a
  // function body, and production runs `node dist/server.js` with no
  // `tsconfig-paths` registered. The alias form builds clean, passes every test
  // (ts-jest maps it), and then throws MODULE_NOT_FOUND the moment
  // startRecurringJobs() runs — which is at boot, so the server never listens.
  // That is exactly what took production to 1/2 tasks on 2026-09-02.
  // Same rule as the lazy requires in `task_dispatch.ts`.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {SysInfoRepo} = require('../db/sysinfo.repo');
  const repo = new SysInfoRepo();
  return {
    async lastRunAt(job) {
      const row = await repo.findById(jobRunStateId(job));
      const at = (row?.data as {lastRunAt?: number} | undefined)?.lastRunAt;
      return typeof at === 'number' ? at : null;
    },
    async recordRun(job, at) {
      // One row per job, not one row holding every job: a single row would be a read-modify-write
      // that two jobs finishing together could interleave and lose.
      await repo.create({_id: jobRunStateId(job), data: {job, lastRunAt: at} as any});
    },
  };
}

/**
 * How often the scheduler asks "is anything due". Not a job cadence — the cadences are in
 * RECURRING_JOBS, and this only bounds how late a due job starts.
 */
export const TICK_MS = 60 * 1000;

/** Live timers, so a second start is a no-op and a stop can actually stop. */
let timers: NodeJS.Timeout[] = [];
/** One pass at a time. A pass that outlives a tick must not have a second one start beside it. */
let passInFlight = false;

/**
 * Fire **at most one** due job, and record that it ran.
 *
 * A job is due when it has never run on this host, or when its last recorded run is older than its
 * interval. That is what makes the schedule survive a reboot: before REALM-9 each job was a bare
 * `setInterval(everyMs)` started at boot with nothing persisted, so the first backup fired 24 h
 * after boot and every restart reset the clock. A box restarted more often than daily never backed
 * up, while the settings screen said backup was on and the availability story promised RPO = the
 * backup interval. The same hole applied to retention and the security digest.
 *
 * **One job per tick, deliberately.** On a box that has never run any of these, everything is due
 * at once, and the target is a Pi 5 with 2 GB. Taking one per minute in table order spreads the
 * catch-up over a few minutes without an in-pass sleep — which would need timers of its own and
 * make this untestable with fake ones. "Within minutes of boot" is what REALM-9 asks for.
 *
 * **Recorded before enqueue, so this is "last attempted", not "last succeeded."** A job that
 * throws every time would otherwise be re-attempted on every tick forever. What actually ran is
 * each job's own business: the backup records `lastBackupAt` and its errors in `BackupState`, and
 * that — not this timestamp — is what a guardian is shown.
 */
export async function runDueRecurringJobs(store: JobRunStore, now: number = Date.now()): Promise<string | null> {
  for (const {job, everyMs} of liteRecurringJobs()) {
    const last = await store.lastRunAt(job);
    if (last !== null && now - last < everyMs) continue;

    await store.recordRun(job, now);
    // `enqueue`, not `runJob`: it is the profile-selected queue, so this stays correct if the box
    // ever gets a real one, and the in-process queue's dedupe already prevents a slow run from
    // overlapping the next tick.
    await getTaskQueue()
      .enqueue(job, {}, {dedupeKey: job})
      .catch((error) => logger.error(`[recurring] failed to enqueue '${job}'`, error));
    return job;
  }
  return null;
}

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
 * someone compared alert counts against the schedule. BullMQ persists its own
 * schedule, so REALM-9 does not apply there.
 *
 * Nothing fires at t=0: the first tick is a minute out, which is also the "wait until the server
 * is actually serving" that the boot catch-up needs.
 */
export function startRecurringJobs(store: JobRunStore = sysInfoJobRunStore()): void {
  if (config.profile !== 'lite') return;

  // A timer in a jest worker outlives the test that made it and fires against
  // torn-down mocks. Same early return as `sse.manager.ts`.
  if (process.env.NODE_ENV === 'test') return;

  if (timers.length) return;

  const timer = setInterval(() => {
    if (passInFlight) return;
    passInFlight = true;
    void runDueRecurringJobs(store)
      .catch((error) => logger.error('[recurring] due-job pass failed', error))
      .finally(() => {
        passInFlight = false;
      });
  }, TICK_MS);

  // Without unref() this timer would keep a box's event loop alive forever, so
  // nothing could ever shut down cleanly.
  timer.unref?.();
  timers.push(timer);

  logger.info(`[recurring] lite scheduler started (${liteRecurringJobs().length} jobs, ${TICK_MS}ms tick)`);
}

/** Stop and forget every timer. Idempotent; used by tests and clean shutdown. */
export function stopRecurringJobs(): void {
  for (const timer of timers) clearInterval(timer);
  timers = [];
  passInFlight = false;
}
