import mongoose, { Document } from "mongoose";
import { IEvent } from "../types/event.types";

export interface IEventDocument extends IEvent, Document {}

const eventSchema = new mongoose.Schema<IEventDocument>(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    type: {
      type: String,
      enum: ["API_DOWN", "API_UP", "SLOW_RESPONSE"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ["UP", "DOWN", "UNKNOWN"],
    },
    currentStatus: {
      type: String,
      enum: ["UP", "DOWN"],
    },
    responseTime: {
      type: Number,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);


// 1. Compound Index: Optimizes query sorting by event triggers
eventSchema.index({ monitorId: 1, workspaceId: 1, triggeredAt: -1 });

// 2. TTL Index: Automatically deletes event alerts older than 30 days
eventSchema.index({ triggeredAt: 1 }, { expireAfterSeconds: 2592000 });


export default mongoose.model<IEventDocument>("Event", eventSchema);
