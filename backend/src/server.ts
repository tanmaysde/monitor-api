import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import { startMonitorWorker } from "./jobs/monitor.worker";
import logger from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    logger.info("MongoDB connected successfully");
    startMonitorWorker();
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed: %o", err);
  });
