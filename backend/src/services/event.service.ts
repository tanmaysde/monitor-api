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
  userId: Types.ObjectId;
  monitorName: string;
  previousStatus: MonitorStatus;
  result: CheckResult;
};

const SLOW_RESPONSE_THRESHOLD = 1000;

export const createMonitorEvents = async ({
  monitorId,
  userId,
  monitorName,
  previousStatus,
  result,
}: CreateMonitorEventsInput) => {
  const events = [];

  if (previousStatus !== "DOWN" && result.status === "DOWN") {
    events.push({
      monitorId,
      userId,
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
      userId,
      type: "API_UP",
      message: `${monitorName} is back up`,
      previousStatus,
      currentStatus: result.status,
      responseTime: result.responseTime,
      triggeredAt: result.checkedAt,
    });
  }

  if (result.status === "UP" && result.responseTime > SLOW_RESPONSE_THRESHOLD) {
    events.push({
      monitorId,
      userId,
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
      userId: event.userId,
      type: event.type as EventType,
      monitorName,
      eventMessage: event.message,
    });
  }

  return createdEvents;
};