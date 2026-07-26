import { Response } from "express";
import Monitor from "../models/Monitor";
import Log from "../models/Log";
import { AuthRequest } from "../middlewares/auth";
import { checkMonitor } from "../services/monitor.service";
import { calculateMonitorAnalytics } from "../services/analytics.service";
import Event from "../models/Event";
import { createMonitorEvents } from "../services/event.service";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { checkSslCertificate } from "../services/ssl.service";
import { addMonitorJob,removeMonitorJob } from "../jobs/monitor.queue";
import { checkMonitorWithRetries } from "../services/monitor.retry.service";

import { WorkspaceRequest } from "../middlewares/rbac";

export const createMonitor = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.create({
      ...req.body,
      workspaceId: req.workspace._id,
    });

    // Add repeatable job to Redis queue
    await addMonitorJob(monitor._id.toString(), monitor.interval);

    res.status(201).json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitors = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitors = await Monitor.find({  workspaceId: req.workspace._id });
    res.json(monitors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorById = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    if (!monitor) {
      return res.status(404).json({ message: "monitor not found" });
    }
    res.json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMonitor = async (req: WorkspaceRequest, res: Response) => {
  try {
    // 1. Fetch the monitor before updating to know its old interval
    const oldMonitor = await Monitor.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
    if (!oldMonitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // 2. Perform the update
    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspace._id },
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // 3. If the interval has changed, update the repeatable job in Redis
    if (oldMonitor.interval !== monitor.interval) {
      await removeMonitorJob(monitor._id.toString(), oldMonitor.interval);
      await addMonitorJob(monitor._id.toString(), monitor.interval);
    }

    res.json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const deleteMonitor = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // Remove repeatable job from Redis queue
    await removeMonitorJob(monitor._id.toString(), monitor.interval);

    res.json({ message: "Monitor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};


export const runMonitorCheck = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const previousStatus = monitor.status;
    const [result, sslInfo] = await Promise.all([
      checkMonitorWithRetries(
        monitor.url,
        monitor.method,
        monitor.retries,
        monitor.retryInterval
      ),
      checkSslCertificate(monitor.url),
    ]);


    monitor.status = result.status;
    monitor.lastCheckedAt = result.checkedAt;
    monitor.lastResponseTime = result.responseTime;
    monitor.sslInfo = sslInfo;

    await monitor.save();

    await Log.create({
      monitorId: monitor._id,
      workspaceId: monitor.workspaceId,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      checkedAt: result.checkedAt,
    });

    const events = await createMonitorEvents({
      monitorId: monitor._id,
      workspaceId: req.workspace._id,
      monitorName: monitor.name,
      previousStatus,
      result,
    });

    res.json({
      message: "Monitor check successful",
      monitor,
      result,
      events,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const runAllMonitorChecks = async () => {
  try {
    const monitors = await Monitor.find();
    for (const monitor of monitors) {
      const previousStatus = monitor.status;
          const [result, sslInfo] = await Promise.all([
      checkMonitorWithRetries(
        monitor.url,
        monitor.method,
        monitor.retries,
        monitor.retryInterval
      ),
      checkSslCertificate(monitor.url),
    ]);


      monitor.status = result.status;
      monitor.lastCheckedAt = result.checkedAt;
      monitor.lastResponseTime = result.responseTime;
      monitor.sslInfo = sslInfo;

      await monitor.save();

      await Log.create({
        monitorId: monitor._id,
        workspaceId: monitor.workspaceId,
        status: result.status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        checkedAt: result.checkedAt,
      });
      await createMonitorEvents({
        monitorId: monitor._id,
        workspaceId: monitor.workspaceId,
        monitorName: monitor.name,
        previousStatus,
        result,
      });
    }
    logger.info("All monitors checked");
  } catch (error: any) {
    logger.error("Monitor cron failed: %s", error.message);
  }
};

export const getMonitorLogs = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // 1. Check if the user sent pagination query params (e.g. ?page=1&limit=10)
    const page = req.query.page ? parseInt(req.query.page as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;

      // 2. Fetch the records and count total items in parallel (fast)
      const [logs, total] = await Promise.all([
        Log.find({ monitorId: monitor._id, workspaceId: req.workspace._id })
          .sort({ checkedAt: -1 })
          .skip(skip)
          .limit(limit),
        Log.countDocuments({ monitorId: monitor._id, workspaceId: req.workspace._id })
      ]);

      // 3. Return the new paginated envelope
      return res.json({
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    // 4. Default fallback: Return the array (Backward compatibility for frontend)
    const logs = await Log.find({
      monitorId: monitor._id,
      workspaceId: req.workspace._id,
    }).sort({ checkedAt: -1 });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const getMonitorAnalytics = async (req: WorkspaceRequest, res: Response) => {
  try {

    const monitorId = req.params.id;
    const workspaceId = req.workspace._id.toString();
    
    // 1. Define a unique Cache Key for this user + monitor
    const cacheKey = `monitor:analytics:${monitorId}:${workspaceId}`;

    // 2. Look up the cache key in Redis
    const cachedAnalytics = await redisClient.get(cacheKey);

    if (cachedAnalytics) {
      // 3. Cache HIT: Parse and return the cached JSON string immediately
      logger.info(`Cache HIT for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedAnalytics));
    }


    // 4. Cache MISS: Query MongoDB and calculate analytics
    logger.info(`Cache MISS for key: ${cacheKey}. Querying database...`);
    const monitor = await Monitor.findOne({
      _id: monitorId,
      workspaceId: req.workspace._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

   const analytics = await calculateMonitorAnalytics(
      String(monitorId),
      workspaceId,
    );

    const payload = {
      monitorId: monitor._id,
      monitorName: monitor.name,
      latestStatus: monitor.status,
      lastCheckedAt: monitor.lastCheckedAt,
      analytics,
    };

    // 5. Store the result in Redis with a 60 seconds Time-to-Live (TTL)
    // "EX" means set expiration in seconds
    await redisClient.set(cacheKey, JSON.stringify(payload), "EX", 60);

    res.json(payload);
    
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorEvents = async (req: WorkspaceRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        Event.find({ monitorId: monitor._id, workspaceId: req.workspace._id })
          .sort({ triggeredAt: -1 })
          .skip(skip)
          .limit(limit),
        Event.countDocuments({ monitorId: monitor._id, workspaceId: req.workspace._id })
      ]);

      return res.json({
        data: events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    const events = await Event.find({
      monitorId: monitor._id,
      workspaceId: req.workspace._id,
    }).sort({ triggeredAt: -1 });

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

