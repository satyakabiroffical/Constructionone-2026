import { Queue } from "bullmq";
import redisConnection from "./redis.config.js";

export const maintenanceQueue = new Queue("maintenanceQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

maintenanceQueue.on("waiting", (job) => {
  console.log("Job waiting:", job.id);
});

maintenanceQueue.on("completed", (job) => {
  console.log("Job completed:", job.id);
});

maintenanceQueue.on("failed", (job, err) => {
  console.log("Job failed:", err.message);
});
