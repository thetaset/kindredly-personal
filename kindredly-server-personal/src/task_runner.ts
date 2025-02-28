import { config } from "@/config";
// import {typeDefs} from '@/graphql/schema';
import validateEnv from "@utils/validateEnv";
import knex from "./db/knex_config";

import { Queue, RedisOptions, Worker } from "bullmq";
import SyncService from "./services/sync.service";
import ItemListService from "./services/item.list.service";
import ItemMetaService from "./services/external_data.service";
import ItemRelationService from "./services/item.relations";
import ItemService from "./services/item.service";
import PermissionService from "./services/permission.service";
import { RequestContext } from "./base/request_context";
import { RequestTypes, TaskRunnerJobTypes } from "./typing/enum_strings";

validateEnv();

const connection: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port as number,
};

class TaskRunner {
  public env: string;
  public port: string | number;
  public changeLogService = new SyncService();
  public permissionService = new PermissionService();
  public itemService = new ItemService();

  public itemlistService = new ItemListService();

  public itemMetaService = new ItemMetaService();

  public itemRelationService = new ItemRelationService();
  public queue: Queue;

  constructor() {
    this.env = config.env;
    this.port = config.port;
    this.queue = new Queue("MainAsyncProc", {
      connection: {
        host: config.redis.host,
        port: config.redis.port as number,
      },
    });

    this.initialize();
  }

  private async initialize() {
    try {
      const response = await knex.raw("SELECT 1");
      if (response) console.log("Successfully connected to Postgres Server");
      await this.queue.drain();


      return;
    } catch (e) {
      console.log("Failed to connect to Postgres Server", e);
      if (config.abortOnDbLaunchFailure) {
        console.error("Stopping process due to launch failure");
        console.error(e);
        throw e;
      }
    }
  }

}
const taskRunner = new TaskRunner();

console.log("Starting Task RUnner!");

const worker = new Worker(
  "MainAsyncProc",
  async (job) => {
    console.log("Async job received: ", job.name);
    try {
       if (job.name == TaskRunnerJobTypes.TASKRUNNER_TEST) {
        return (
          "TASK RUNNER IS UP AND RUNNING.  REQUESTER MESSAGE: " +
          job.data.message
        );
      } else if (job.name == TaskRunnerJobTypes.fetchMetadata) {
        console.log("Fetch meta for ", job.data.url);
        return await taskRunner.itemMetaService.fetchMetadata(job.data.url);
      } else if (job.name == TaskRunnerJobTypes.getBannerImageDataForUrl) {

        console.log("getBannerImageDataForUrl: deprecated");

      } else {
        console.log("Unknown job name", job.name);
      }
    } catch (e) {
      console.error("Error in async job", e);
    }
  },
  { connection }
);

// catch worker exceptions
worker.on("error", (err) => {
  console.error("Worker error:", err);
});
