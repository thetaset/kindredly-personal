
import { mainQueue, queueEvents } from "@/base/taskqueue_instances";
import { Job } from "bullmq";
class TaskRunnerService {

  async runTask(name: string, data: {}) {
    const job = await mainQueue.add(name, data);
    await job.waitUntilFinished(queueEvents);

    const result = await Job.fromId(mainQueue, job.id);
    return result.returnvalue;
  }
}

export default TaskRunnerService;
