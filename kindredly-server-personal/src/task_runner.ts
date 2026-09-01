import {config} from '@/config';
// import {typeDefs} from '@/graphql/schema';
import validateEnv from '@utils/validateEnv';
import knex from './db/knex_config';

import {Queue, RedisOptions, Worker} from 'bullmq';
import {runJob} from './base/task_dispatch';
import {cloudRecurringJobs} from './base/recurring_jobs';

validateEnv();

const connection: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port as number,
};

/**
 * The task-runner process: schedules the repeatables and runs the worker.
 *
 * It used to hold a service instance per job type, because the worker's switch
 * lived inline and reached them through this object. That switch is now
 * `base/task_dispatch.ts`, which resolves its own handlers - so those ten fields
 * went with it rather than staying as eight eager constructions this process no
 * longer reads.
 */
class TaskRunner {
  public env: string;
  public port: string | number;
  public queue: Queue;

  constructor() {
    this.env = config.env;
    this.port = config.port;
    // Same queue name as base/taskqueue_instances.ts's mainQueue, so it needs the
    // same retention bound - otherwise the repeatables scheduled below are exactly
    // the jobs that leak. See the note on defaultJobOptions in that file.
    this.queue = new Queue('MainAsyncProc', {
      connection: {
        host: config.redis.host,
        port: config.redis.port as number,
      },
      defaultJobOptions: {
        removeOnComplete: {count: 1000},
        removeOnFail: {count: 5000},
      },
    });

    this.initialize();
  }

  private async initialize() {
    try {
      const response = await knex.raw('SELECT 1');
      if (response) console.log('Successfully connected to Postgres Server');
      await this.queue.drain();

      await this.scheduleRecurringJobs();

      return;
    } catch (e) {
      console.log('Failed to connect to Postgres Server', e);
      if (config.abortOnDbLaunchFailure) {
        console.error('Stopping process due to launch failure');
        console.error(e);
        throw e;
      }
    }
  }

  private async scheduleRecurringJobs() {
    try {
      console.log('Scheduling recurring jobs...');

      try {
        // remove all repeatable jobs
        let scheduledJobs = await this.queue.getJobSchedulers();
        for (let job of scheduledJobs) {
          console.log('Removing job', job.key);
          await this.queue.removeJobScheduler(job.key);
        }
      } catch (e) {
        console.error('Error removing repeatable jobs', e);
      }

      // The cadences live in base/recurring_jobs.ts, which the `lite` scheduler
      // reads too. Two copies of this list would drift silently - an appliance
      // purging data on a different schedule than the cloud, noticed only when a
      // privacy question got the wrong answer.
      for (const {job, everyMs, immediately} of cloudRecurringJobs()) {
        await this.queue.add(
          job,
          {},
          {
            repeat: {every: everyMs, immediately},
            repeatJobKey: job,
          },
        );
      }

      console.log('Recurring jobs scheduled!');
    } catch (error) {
      console.error('Error scheduling recurring jobs:', error);
    }
  }
}
const taskRunner = new TaskRunner();

console.log('Starting Task RUnner!');

const worker = new Worker(
  'MainAsyncProc',
  async (job) => {
    console.log('Async job received: ', job.name);
    // The switch this used to hold now lives in base/task_dispatch.ts, so the
    // in-process queue the `lite` profile uses runs the same handlers. Two
    // copies would drift, and the drift would be silent - a job type handled
    // here and quietly ignored on the appliance.
    return await runJob(job.name, job.data);
  },
  {connection, concurrency: 4},
);

// catch worker exceptions
worker.on('error', (err) => {
  console.error('Worker error:', err);
});
