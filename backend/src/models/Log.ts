import mongoose, {Document} from "mongoose";
import { ILog } from "../types/log.types";

export interface ILogDocument extends ILog, Document {}

const logSchema = new mongoose.Schema<ILogDocument>(
{monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      index: true,
    },
  },
  { timestamps: true }
)

export default mongoose.model<ILogDocument>("Log", logSchema);
