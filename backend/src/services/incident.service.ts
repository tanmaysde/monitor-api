import Incident from "../models/Incident";
import logger from "../utils/logger";

interface ICheckResult {
  status: "UP" | "DOWN";
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  checkedAt: Date;
}

/**
 * Handles the auto-triggering and auto-resolving of incidents when a monitor check finishes.
 */
export const handleIncidentLifecycle = async (
  monitor: any,
  previousStatus: string,
  result: ICheckResult
) => {
  try {
    if (previousStatus !== "DOWN" && result.status === "DOWN") {
      // 1. Double check there is no already active unresolved incident for this monitor (prevent duplicates)
      const existingIncident = await Incident.findOne({
        monitorId: monitor._id,
        status: { $in: ["TRIGGERED", "ACKNOWLEDGED"] },
      });

      if (!existingIncident) {
        await Incident.create({
          workspaceId: monitor.workspaceId,
          monitorId: monitor._id,
          title: `Service "${monitor.name}" is DOWN`,
          status: "TRIGGERED",
          severity: "CRITICAL",
          timeline: [
            {
              status: "TRIGGERED",
              action: `System detected outage. Response code: ${result.statusCode || "N/A"}. Error: ${result.errorMessage || "None"}.`,
              timestamp: new Date(),
            },
          ],
        });
        logger.info(`Incident triggered and logged for monitor: ${monitor.name}`);
      } else {
        logger.info(`Monitor ${monitor.name} is DOWN, but active incident already exists. Skipping duplicate creation.`);
      }
    } else if (previousStatus === "DOWN" && result.status === "UP") {
      // 2. Monitor went UP -> Resolve any active incidents
      const activeIncident = await Incident.findOne({
        monitorId: monitor._id,
        status: { $in: ["TRIGGERED", "ACKNOWLEDGED"] },
      });

      if (activeIncident) {
        activeIncident.status = "RESOLVED";
        activeIncident.resolvedAt = new Date();
        activeIncident.timeline.push({
          status: "RESOLVED",
          action: `System recovered automatically. Response time: ${result.responseTime}ms. Status code: ${result.statusCode}.`,
          timestamp: new Date(),
        });
        await activeIncident.save();
        logger.info(`Incident auto-resolved for monitor: ${monitor.name}`);
      }
    }
  } catch (error: any) {
    logger.error(`Error in handleIncidentLifecycle for monitor ${monitor._id}: ${error.message}`);
  }
};
