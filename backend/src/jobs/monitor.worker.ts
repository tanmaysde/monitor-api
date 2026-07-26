import { Worker, Job } from "bullmq";
import Monitor from "../models/Monitor";
import Log from "../models/Log";
import { checkMonitorWithRetries } from "../services/monitor.retry.service";
import { checkSslCertificate } from "../services/ssl.service";
import { createMonitorEvents } from "../services/event.service";
import logger from "../utils/logger";
import Redis from "ioredis"

// 1. Initialize the BullMQ Worker
// It listens to the "monitor-checks" queue and uses our Redis connection.
export const startMonitorWorker = () => {
  const connection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null, // Required by BullMQ
  });
  
  const worker = new Worker(
    "monitor-checks",
    async (job: Job) => {
      const { monitorId } = job.data;
      logger.info(`Worker picked up check for monitor: ${monitorId}`);

      // 2. Fetch the monitor details from MongoDB
      const monitor = await Monitor.findById(monitorId);
      if (!monitor) {
        logger.warn(`Monitor ${monitorId} not found in DB. Skipping check.`);
        return;
      }

      const previousStatus = monitor.status;

      try {
        // 3. Perform HTTP ping and SSL check in parallel (fast!)
                const [result, sslInfo] = await Promise.all([
          checkMonitorWithRetries(
            monitor.url,
            monitor.method,
            monitor.retries,
            monitor.retryInterval
          ),
          checkSslCertificate(monitor.url),
        ]);

        // 4. Update the monitor state in the database
        monitor.status = result.status;
        monitor.lastCheckedAt = result.checkedAt;
        monitor.lastResponseTime = result.responseTime;
        monitor.sslInfo = sslInfo;
        await monitor.save();

        // 5. Create a check history log entry
        await Log.create({
          monitorId: monitor._id,
          userId: monitor.userId,
          status: result.status,
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          errorMessage: result.errorMessage,
          checkedAt: result.checkedAt,
        });

        // 6. Fire system events if status changed (e.g. UP -> DOWN)
        await createMonitorEvents({
          monitorId: monitor._id,
          userId: monitor.userId,
          monitorName: monitor.name,
          previousStatus,
          result,
        });

        logger.info(`Finished check for monitor ${monitor.name} (${result.status})`);
      } catch (err: any) {
        logger.error(`Error during worker ping check for monitor ${monitorId}: ${err.message}`);
        throw err; // Throwing tells BullMQ the job failed, triggering automatic retry
      }
    },
    {
       connection: connection,
      concurrency: 5, // Process up to 5 pings concurrently in parallel!
    }
  );

  worker.on("ready", () => {
    logger.info("BullMQ Worker started successfully and listening for jobs");
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });
};
