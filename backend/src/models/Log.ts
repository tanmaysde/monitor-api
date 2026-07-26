import mongoose, {Document} from "mongoose";
import { ILog } from "../types/log.types";

export interface ILogDocument extends ILog, Document {}

const logSchema = new mongoose.Schema<ILogDocument>(
    {monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    status: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    statusCode: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    checkedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 1. Compound Index: Optimizes queries filtering by monitor + user and sorting by date
logSchema.index({ monitorId: 1, workspaceId: 1, checkedAt: -1 });

// 2. TTL Index: Automatically deletes log documents older than 30 days (value in seconds)
logSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 2592000 });


export default mongoose.model<ILogDocument>("Log", logSchema);
