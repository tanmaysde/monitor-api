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
      index: true,
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