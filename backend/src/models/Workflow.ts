import mongoose, { Document } from "mongoose";
import { IWorkflow } from "../types/workflow.types";

export interface IWorkflowDocument extends IWorkflow, Document {}

const workflowConditionSchema = new mongoose.Schema(
  {},
  { _id: false, strict: false }
);

const workflowActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["EMAIL", "WEBHOOK", "SLACK", "TEAMS"],
      required: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema<IWorkflowDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      enum: ["API_DOWN", "API_UP", "SLOW_RESPONSE"],
      required: true,
      index: true,
    },
    // Which monitors this workflow reacts to. Empty (or missing on older documents)
    // means "every monitor in the workspace", which was the original behaviour.
    monitorIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Monitor" }],
      default: [],
    },
    conditions: {
      type: [workflowConditionSchema],
      default: [],
    },
    actions: {
      type: [workflowActionSchema],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IWorkflowDocument>("Workflow", workflowSchema);
