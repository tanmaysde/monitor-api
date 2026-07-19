import { Response } from "express";
import Monitor from "../models/Monitor";
import Log from "../models/Log";
import { AuthRequest } from "../middlewares/auth";
import { checkMonitor } from "../services/monitor.service";
import { calculateMonitorAnalytics } from "../services/analytics.service";
import Event from "../models/Event";
import { createMonitorEvents } from "../services/event.service";

export const createMonitor = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.create({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitors = async (req: AuthRequest, res: Response) => {
  try {
    const monitors = await Monitor.find({ userId: req.user.id });
    res.json(monitors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorById = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "monitor not found" });
    }
    res.json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMonitor = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { returnDocument: "after", runValidators: true },
    );
    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    res.json(monitor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMonitor = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    res.json({ message: "Monitor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const runMonitorCheck = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const previousStatus = monitor.status;
    const result = await checkMonitor(monitor.url, monitor.method);

    monitor.status = result.status;
    monitor.lastCheckedAt = result.checkedAt;
    monitor.lastResponseTime = result.responseTime;

    await monitor.save();

    await Log.create({
      monitorId: monitor._id,
      userId: monitor.userId,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      checkedAt: result.checkedAt,
    });

    const events = await createMonitorEvents({
      monitorId: monitor._id,
      userId: monitor.userId,
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
      const result = await checkMonitor(monitor.url, monitor.method);

      monitor.status = result.status;
      monitor.lastCheckedAt = result.checkedAt;
      monitor.lastResponseTime = result.responseTime;

      await monitor.save();

      await Log.create({
        monitorId: monitor._id,
        userId: monitor.userId,
        status: result.status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        checkedAt: result.checkedAt,
      });
      await createMonitorEvents({
        monitorId: monitor._id,
        userId: monitor.userId,
        monitorName: monitor.name,
        previousStatus,
        result,
      });
    }
    console.log("All monitors checked");
  } catch (error: any) {
    console.error("Monitor cron failed:", error.message);
  }
};

export const getMonitorLogs = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user.id,
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
        Log.find({ monitorId: monitor._id, userId: req.user.id })
          .sort({ checkedAt: -1 })
          .skip(skip)
          .limit(limit),
        Log.countDocuments({ monitorId: monitor._id, userId: req.user.id })
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
      userId: req.user.id,
    }).sort({ checkedAt: -1 });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const getMonitorAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const analytics = await calculateMonitorAnalytics(
      String(req.params.id),
      req.user.id,
    );

    res.json({
      monitorId: monitor._id,
      monitorName: monitor.name,
      latestStatus: monitor.status,
      lastCheckedAt: monitor.lastCheckedAt,
      analytics,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorEvents = async (req: AuthRequest, res: Response) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        Event.find({ monitorId: monitor._id, userId: req.user.id })
          .sort({ triggeredAt: -1 })
          .skip(skip)
          .limit(limit),
        Event.countDocuments({ monitorId: monitor._id, userId: req.user.id })
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
      userId: req.user.id,
    }).sort({ triggeredAt: -1 });

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

