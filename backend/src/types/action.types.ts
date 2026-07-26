import { Types } from "mongoose";
import { EventType } from "./event.types";

export type ActionType = "EMAIL" | "WEBHOOK" | "SLACK" | "TEAMS";

export interface ActionContext {
  workflowId: Types.ObjectId;
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  workspaceId: Types.ObjectId;
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

export interface WebhookActionConfig {
  url: string;
  headers?: Record<string, string>; // Optional headers (e.g. Authorization keys)
}

export interface SlackActionConfig {
  webhookUrl: string;
}

export interface TeamsActionConfig {
  webhookUrl: string;
}