import { Worker } from "bullmq";
import redisConnection from "../config/redis.config.js";
import AppMaintenance from "../models/admin/appMaintenance.model.js";
new Worker(
  "maintenanceQueue",
  async (job) => {
    const { maintenanceId } = job.data;

    const maintenance = await AppMaintenance.findById(maintenanceId);
    if (!maintenance) return;

    if (job.name === "START_MAINTENANCE") {
      maintenance.isActive = true;
      await maintenance.save();

      await redisConnection.set(
        "MAINTENANCE_MODE",
        JSON.stringify({
          isActive: true,
          title: maintenance.title,
          description: maintenance.description,
          startDateTime: maintenance.startDateTime,
          endDateTime: maintenance.endDateTime,
        }),
      );
    }
    console.log("JOB RECEIVED:", job.name, job.data);
    if (job.name === "END_MAINTENANCE") {
      maintenance.isActive = false;
      await maintenance.save();
      await redisConnection.del("MAINTENANCE_MODE");
    }
  },
  {
    connection: redisConnection,
  },
);

console.log("Maintenance Worker Started...");
