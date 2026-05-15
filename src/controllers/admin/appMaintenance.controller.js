import AppMaintenance from "../../models/admin/appMaintenance.model.js";
import { maintenanceQueue } from "../../config/appMaintenance.queue.js";
import redis from "../../config/redis.config.js";
import redisConnection from "../../config/redis.config.js";
const safeDelay = (time) => {
  return Math.max(new Date(time).getTime() - Date.now(), 0);
};

export const createMaintenance = async (req, res) => {
  try {
    const { title, description, startDateTime, endDateTime } = req.body;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).json({
        success: false,
        message: "End time must be greater than start time",
      });
    }

    const maintenance = await AppMaintenance.create({
      title,
      description,
      startDateTime,
      endDateTime,
    });

    // START JOB
    await maintenanceQueue.add(
      "START_MAINTENANCE",
      { maintenanceId: maintenance._id },
      {
        jobId: `maintenance:${maintenance._id}:start`,
        delay: safeDelay(startDateTime),
        removeOnComplete: true,
      },
    );

    // END JOB
    await maintenanceQueue.add(
      "END_MAINTENANCE",
      { maintenanceId: maintenance._id },
      {
        jobId: `maintenance:${maintenance._id}:end`,
        delay: safeDelay(endDateTime),
        removeOnComplete: true,
      },
    );

    return res.status(201).json({
      success: true,
      message: "Maintenance scheduled successfully",
      maintenance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMaintenance = async (req, res) => {
  try {
    // 1. All scheduled maintenances (DB)
    const maintenances = await AppMaintenance.find().sort({ createdAt: -1 });

    // 2. Live status (Redis)
    const liveData = await redisConnection.get("MAINTENANCE_MODE");

    return res.status(200).json({
      success: true,
      message: "Maintenance data fetched successfully",
      data: {
        schedules: maintenances,
        live: liveData ? JSON.parse(liveData) : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelMaintenance = async (req, res) => {
  try {
    const { maintenanceId } = req.params;

    const maintenance = await AppMaintenance.findById(maintenanceId);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance not found",
      });
    }

    // Mark inactive
    maintenance.isActive = false;
    await maintenance.save();

    // Remove Redis key
    await redisConnection.del("MAINTENANCE_MODE");

    // Correct Job IDs
    const startJobId = `maintenance:${maintenanceId}:start`;
    const endJobId = `maintenance:${maintenanceId}:end`;

    // Get jobs
    const startJob = await maintenanceQueue.getJob(startJobId);
    const endJob = await maintenanceQueue.getJob(endJobId);

    // Remove jobs if exist
    if (startJob) {
      await startJob.remove();
    }

    if (endJob) {
      await endJob.remove();
    }

    return res.status(200).json({
      success: true,
      message: "Maintenance cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//users apps
export const getMaintenanceStatus = async (req, res) => {
  try {
    // 1. First check Redis (fastest)
    const cached = await redisConnection.get("MAINTENANCE_MODE");

    if (cached) {
      const data = JSON.parse(cached);

      return res.status(200).json({
        success: true,
        maintenance: data.isActive,
        data,
      });
    }

    // 2. fallback DB check
    const maintenance = await AppMaintenance.findOne({
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!maintenance) {
      return res.status(200).json({
        success: true,
        maintenance: false,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      maintenance: true,
      data: {
        title: maintenance.title,
        description: maintenance.description,
        startDateTime: maintenance.startDateTime,
        endDateTime: maintenance.endDateTime,
        isActive: maintenance.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
