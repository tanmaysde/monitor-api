import cron from "node-cron";
import { runAllMonitorChecks } from "../controllers/monitor.controller";

export const startMonitorCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await runAllMonitorChecks();
    } catch (error) {
      console.error("Monitor cron failed:", error);
    }
  });
};