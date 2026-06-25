import { Types } from "mongoose";
import { EventType } from "./event.types";

export type ActionType = "EMAIL";

export interface ActionContext {
  workflowId: Types.ObjectId;
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  trigger: EventType;
  workflowName?: string;
  monitorName?: string;
  eventMessage?: string;
}

export interface EmailActionConfig {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}
