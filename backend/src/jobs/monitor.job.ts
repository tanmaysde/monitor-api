import cron from "node-cron";
import { runAllMonitorChecks } from "../controllers/monitor.controller";
import logger from "../utils/logger";

export const startMonitorCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await runAllMonitorChecks();
    } catch (error) {
      logger.error("Monitor cron failed: %o", error);
    }
  });
};