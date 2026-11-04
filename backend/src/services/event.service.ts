import { Types } from "mongoose";
import Event from "../models/Event";
import { EventType } from "../types/event.types";
import { runWorkflowsForEvent } from "./workflow.service";

type MonitorStatus = "UP" | "DOWN" | "UNKNOWN";

type CheckResult = {
  status: "UP" | "DOWN";
  responseTime: number;
  checkedAt: Date;
};

type CreateMonitorEventsInput = {
  monitorId: Types.ObjectId;
  workspaceId: Types.ObjectId; 
  monitorName: string;
  previousStatus: MonitorStatus;
  // Response time of the check BEFORE this one (used to avoid repeating SLOW_RESPONSE alerts)
  previousResponseTime?: number;
  result: CheckResult;
};

const SLOW_RESPONSE_THRESHOLD = 1000;

export const createMonitorEvents = async ({
  monitorId,
  workspaceId,
  monitorName,
  previousStatus,
  previousResponseTime,
  result,
}: CreateMonitorEventsInput) => {
  const events = [];

  if (previousStatus !== "DOWN" && result.status === "DOWN") {
    events.push({
      monitorId,
      workspaceId,
      type: "API_DOWN",
      message: `${monitorName} is down`,
      previousStatus,
      currentStatus: result.status,
      responseTime: result.responseTime,
      triggeredAt: result.checkedAt,
    });
  }

  if (previousStatus === "DOWN" && result.status === "UP") {
    events.push({
      monitorId,
      workspaceId,
      type: "API_UP",
      message: `${monitorName} is back up`,
      previousStatus,
      currentStatus: result.status,
      responseTime: result.responseTime,
      triggeredAt: result.checkedAt,
    });
  }

  // Only alert when the monitor BECOMES slow, not on every slow check while it stays slow
  const wasAlreadySlow =
    previousStatus === "UP" && (previousResponseTime ?? 0) > SLOW_RESPONSE_THRESHOLD;

  if (
    result.status === "UP" &&
    result.responseTime > SLOW_RESPONSE_THRESHOLD &&
    !wasAlreadySlow
  ) {
    events.push({
      monitorId,
      workspaceId,
      type: "SLOW_RESPONSE",
      message: `${monitorName} responded slowly`,
      previousStatus,
      currentStatus: result.status,
      responseTime: result.responseTime,
      triggeredAt: result.checkedAt,
    });
  }

  if (events.length === 0) {
    return [];
  }

  const createdEvents = await Event.insertMany(events);

  for (const event of createdEvents) {
    await runWorkflowsForEvent({
      eventId: event._id as Types.ObjectId,
      monitorId: event.monitorId,
      workspaceId: event.workspaceId,
      type: event.type as EventType,
      monitorName,
      eventMessage: event.message,
    });
  }

  return createdEvents;
};