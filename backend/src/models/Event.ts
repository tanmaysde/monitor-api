import mongoose, { Document } from "mongoose";
import { IEvent } from "../types/event.types";

export interface IEventDocument extends IEvent, Document {}

const eventSchema = new mongoose.Schema<IEventDocument>(
  {
    monitorId: {
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
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IEventDocument>("Event", eventSchema);
