import { Queue } from "bullmq";
import Redis from "ioredis"; // Import raw Redis instead of redisClient
import logger from "../utils/logger";

// Create a dedicated Redis connection for the Queue
const connection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const monitorQueue = new Queue("monitor-checks", {
  connection,
});


/**
 * Registers a repeatable job in Redis for a specific monitor.
 */
export const addMonitorJob = async (monitorId: string, intervalMinutes: number) => {
  try {
    // BullMQ requires interval in milliseconds, so we convert minutes to ms
    const intervalMs = intervalMinutes * 60 * 1000;

    // Add repeatable job to Redis
    await monitorQueue.add(
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

    logger.info(`Scheduled repeatable job for monitor ${monitorId} every ${intervalMinutes}m`);
  } catch (error) {
    logger.error(`Failed to schedule job for monitor ${monitorId}: %o`, error);
  }
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
