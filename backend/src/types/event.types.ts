import { Types } from "mongoose";

export type EventType = "API_DOWN" | "API_UP" | "SLOW_RESPONSE";

export interface IEvent {
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  type: EventType;
  message: string;
  previousStatus?: "UP" | "DOWN" | "UNKNOWN";
  currentStatus?: "UP" | "DOWN";
  responseTime?: number;
  triggeredAt: Date;
}
