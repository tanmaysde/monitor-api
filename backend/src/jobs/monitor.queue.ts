import { Queue } from "bullmq";
import Redis from "ioredis"; // Import raw Redis instead of redisClient
import logger from "../utils/logger";
import Monitor from "../models/Monitor";

// Create a dedicated Redis connection for the Queue
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isTls = redisUrl.startsWith("rediss://");

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableOfflineQueue: false,
  tls: isTls ? {} : undefined, // Enable TLS for Upstash
  connectTimeout: 10000,
});

export const monitorQueue = new Queue("monitor-checks", {
  connection,
});


/**
 * Registers a repeatable job in Redis for a specific monitor.
 */
const scheduleRepeatableJob = (queue: Queue, monitorId: string, intervalMinutes: number) => {
  // BullMQ requires interval in milliseconds, so we convert minutes to ms
  const intervalMs = intervalMinutes * 60 * 1000;

  // Add repeatable job to Redis
  return queue.add(
    `ping-${monitorId}`, // Unique job name
    { monitorId },       // Data payload that worker will receive
    {
      repeat: {
        every: intervalMs, // Trigger interval
      },
      attempts: 3,         // Retry up to 3 times on failure
      backoff: 5000,       // Wait 5 seconds before retrying
      removeOnComplete: true, // Clean up history to save memory
      removeOnFail: true,
    }
  );
};

export const addMonitorJob = async (monitorId: string, intervalMinutes: number) => {
  try {
    await scheduleRepeatableJob(monitorQueue, monitorId, intervalMinutes);

    logger.info(`Scheduled repeatable job for monitor ${monitorId} every ${intervalMinutes}m`);
  } catch (error) {
    logger.error(`Failed to schedule job for monitor ${monitorId}: %o`, error);
  }
};

/**
 * Makes sure every monitor in the database has its repeatable job in Redis.
 *
 * Schedules live only in Redis. If Redis is wiped/replaced (or a monitor was inserted
 * without going through the API) its checks would silently never run. This runs at
 * startup and ADDS only what is missing: it never removes or changes existing jobs, and
 * adding a job that already exists is harmless.
 */
export const syncMonitorJobs = async (queue: Queue = monitorQueue) => {
  const existing = await queue.getRepeatableJobs();
  const scheduledNames = new Set(existing.map((job) => job.name));

  const monitors = await Monitor.find().select("_id interval").lean();
  let added = 0;

  for (const monitor of monitors) {
    if (scheduledNames.has(`ping-${monitor._id}`)) continue;
    await scheduleRepeatableJob(queue, String(monitor._id), monitor.interval ?? 5);
    added += 1;
  }

  return { total: monitors.length, added };
};

/**
 * Removes a repeatable job from Redis.
 */
export const removeMonitorJob = async (monitorId: string, intervalMinutes: number) => {
  try {
    const intervalMs = intervalMinutes * 60 * 1000;

    // To remove a repeatable job, BullMQ needs the exact same job name and repeat options
    await monitorQueue.removeRepeatable(`ping-${monitorId}`, {
      every: intervalMs,
    });

    logger.info(`Removed repeatable job for monitor ${monitorId}`);
  } catch (error) {
    logger.error(`Failed to remove job for monitor ${monitorId}: %o`, error);
  }
};
