import { Types } from "mongoose";
import { EventType } from "./event.types";
import { ActionType } from "./action.types";

export interface WorkflowAction {
  type: ActionType;
  config?: Record<string, unknown>;
}

export interface IWorkflow {
  name: string;
  userId: Types.ObjectId;
  trigger: EventType;
  conditions: Record<string, unknown>[];
  actions: WorkflowAction[];
  enabled: boolean;
}