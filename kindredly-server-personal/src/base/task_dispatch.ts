import {RequestContext} from './request_context';
import {RequestTypes, TaskRunnerJobTypes} from '@/typing/enum_strings';

/**
 * The one place that knows what each background job actually does.
 *
 * Extracted from the `Worker` callback in `task_runner.ts` so both queue
 * backends run the same code: BullMQ's worker in `cloud`, and the in-process
 * queue in `lite`, where there is no separate task-server process to run a
 * worker at all. Two copies of this switch would drift, and the drift would be
 * silent - a job type handled in one profile and quietly ignored in the other.
 *
 * **A table, not an if-chain, on purpose.** `task_dispatch.test.ts` asserts the
 * table is total over `TaskRunnerJobTypes`; an if-chain has no shape a test can
 * check, and the failure mode it hides is the bad one - a job type that enqueues
 * fine, runs nothing, and returns undefined forever.
 *
 * **`_internal` handlers are required lazily.** The published self-hosted repo
 * has no `services/_internal/` directory, and `swc` never resolves imports, so a
 * top-level import here would build cleanly and then `MODULE_NOT_FOUND` at boot
 * on an appliance. Same pattern as `services/subscription.service.ts`. The four
 * lazy job types are `_internal`-only features a box does not have.
 *
 * **Every lazy require below is RELATIVE, and must stay that way.** swc rewrites
 * `@/` aliases in top-level import statements but NOT in `require()` calls
 * inside a function body, and production runs `node dist/server.js` with no
 * `tsconfig-paths` registered - so `require('@/services/x')` builds clean, passes
 * every test (ts-jest maps the alias), and then throws MODULE_NOT_FOUND the
 * first time the job runs. `task_dispatch.test.ts` guards this.
 */

export type TaskHandler = (data: any) => Promise<unknown>;

const ctxFor = (data: any) =>
  new RequestContext({
    currentUserId: data?.userId,
    accountId: data?.accountId,
    request: {type: RequestTypes.taskRunner},
  });

/** Cloud-only handlers, resolved on first use so the module imports anywhere. */
function internalPublished() {
  // personal-optional: guarded, never reached on a self-hosted server
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Service = require('../services/_internal/internal_published.service').default;
  return new Service();
}

export const taskHandlers: Record<TaskRunnerJobTypes, TaskHandler> = {
  // ---- available in every profile ----------------------------------------
  [TaskRunnerJobTypes.fetchMetadata]: async (data) => {
    const ExternalDataService = require('../services/external_data.service').default;
    return await new ExternalDataService().fetchMetadata(data.url);
  },

  [TaskRunnerJobTypes.contentClassification]: async (data) => {
    const ExternalDataService = require('../services/external_data.service').default;
    return await new ExternalDataService().contentClassification(ctxFor(data), data);
  },

  [TaskRunnerJobTypes.runDataRetention]: async () => {
    const {DataRetentionService} = require('../services/data_retention.service');
    return await DataRetentionService.instance.runPurge();
  },

  [TaskRunnerJobTypes.runSecurityDigest]: async () => {
    const {SecurityDigestService} = require('../services/security_digest.service');
    return await SecurityDigestService.instance.run();
  },

  [TaskRunnerJobTypes.runCompanionTamperWatch]: async () => {
    const {CompanionTamperWatchService} = require('../services/companion_tamper_watch.service');
    return await CompanionTamperWatchService.instance.run();
  },

  [TaskRunnerJobTypes.TASKRUNNER_TEST]: async (data) =>
    'TASK RUNNER IS UP AND RUNNING.  REQUESTER MESSAGE: ' + data.message,

  // Deprecated, kept so the table stays total and an old enqueued job is a
  // no-op rather than an "unknown job name".
  [TaskRunnerJobTypes.getBannerImageDataForUrl]: async () => {
    console.log('getBannerImageDataForUrl: deprecated');
    return null;
  },

  // ---- cloud-only (_internal), lazily required ---------------------------
  [TaskRunnerJobTypes.subscribe]: async (data) =>
    await internalPublished().subscribe(ctxFor(data), data.publishId, data.userIds),

  [TaskRunnerJobTypes.updateSubscription]: async (data) =>
    await internalPublished().updateSubscription(ctxFor(data), data.publishId, data.collectionId),

  [TaskRunnerJobTypes.runAutoPublish]: async (data) => {
    // Returns null, not the result: runAutoPublish's return value is large and
    // nothing reads it. Preserved from the original worker deliberately.
    await internalPublished().runAutoPublish(new RequestContext({request: {type: RequestTypes.taskRunner}}), data);
    return null;
  },

  [TaskRunnerJobTypes.publishedModerationAiReview]: async (data) => {
    // personal-optional: guarded, never reached on a self-hosted server
    const {PublishedModerationReporter} = require('../services/_internal/published_moderation_reporter.service');
    return await PublishedModerationReporter.instance.runAiReviewJob(ctxFor(data), data);
  },
};

/**
 * Run one job by name.
 *
 * Errors are logged and swallowed, exactly as the original worker did. That is
 * load-bearing rather than sloppy: `TaskRunnerService.runTask` awaits
 * `waitUntilFinished`, and letting a handler reject would surface an infra
 * failure as a request failure on the foreground metadata paths.
 */
export async function runJob(name: string, data: any): Promise<unknown> {
  const handler = taskHandlers[name as TaskRunnerJobTypes];
  if (!handler) {
    console.log('Unknown job name', name);
    return undefined;
  }
  try {
    return await handler(data);
  } catch (e) {
    console.error('Error in async job', e);
    return undefined;
  }
}
