
import { config } from "@/config";
import { RedisOptions, Queue, QueueEvents } from "bullmq";

const connection: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port as number,
};

export const mainQueue = new Queue("MainAsyncProc", {
  connection,
});
export const queueEvents = new QueueEvents("MainAsyncProc", { connection });