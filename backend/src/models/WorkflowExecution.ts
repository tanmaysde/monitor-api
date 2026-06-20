import mongoose, { Document, Types } from "mongoose";
import { EventType } from "../types/event.types";
import { WorkflowAction } from "../types/workflow.types";

export interface IWorkflowExecution {
  workflowId: Types.ObjectId;
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  trigger: EventType;
  status: "SUCCESS" | "FAILED";
  actions: WorkflowAction[];
  message?: string;
  executedAt: Date;
}

export interface IWorkflowExecution {
  workflowId: Types.ObjectId;
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  trigger: EventType;
  status: "SUCCESS" | "FAILED";
  actions: WorkflowAction[];

  message?: string;
  executedAt: Date;
}
const workflowActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export interface IWorkflowExecutionDocument extends IWorkflowExecution, Document {}

const workflowExecutionSchema =
  new mongoose.Schema<IWorkflowExecutionDocument>(
    {
      workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workflow",
        required: true,
        index: true,
      },
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true,
      },
      monitorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Monitor",
        required: true,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      trigger: {
        type: String,
        enum: ["API_DOWN", "API_UP", "SLOW_RESPONSE"],
        required: true,
      },
      status: {
        type: String,
        enum: ["SUCCESS", "FAILED"],
        default: "SUCCESS",
      },
     actions: {
  type: [workflowActionSchema],
  default: [],
},
      message: {
        type: String,
      },
      executedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { timestamps: true }
  );

export default mongoose.model<IWorkflowExecutionDocument>(
  "WorkflowExecution",
  workflowExecutionSchema
);