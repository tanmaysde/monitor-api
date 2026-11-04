import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import { startMonitorWorker } from "./jobs/monitor.worker";
import { startAnalysisWorker } from "./jobs/analysis.worker";
import { syncMonitorJobs } from "./jobs/monitor.queue";
import logger from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    logger.info("MongoDB connected successfully");
    startMonitorWorker();
    startAnalysisWorker();

    // Re-create any missing check schedules (e.g. after Redis was reset). Set
    // SYNC_MONITOR_JOBS=false to skip (useful when pointing at a demo/seed database).
    if (process.env.SYNC_MONITOR_JOBS !== "false") {
      syncMonitorJobs()
        .then(({ total, added }) => logger.info(`Schedule sync: ${added} of ${total} monitors needed a job`))
        .catch((err) => logger.error(`Schedule sync failed: ${err.message}`));
    }
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed: %o", err);
  });
