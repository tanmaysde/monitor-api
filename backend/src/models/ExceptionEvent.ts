import mongoose, { Document, Schema } from "mongoose";

// Interface for individual crash log
export interface IExceptionEventDocument extends Document {
  issueId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  errorType: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  browser?: {
    name: string;
    version: string;
  };
  os?: {
    name: string;
    version: string;
  };
  user?: {
    id?: string;
    email?: string;
    ipAddress?: string;
  };
  extra?: Record<string, any>;
  timestamp: Date;
}

const exceptionEventSchema = new Schema<IExceptionEventDocument>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "ExceptionIssue",
      required: true,
      index: true, // Connects back to the parent Issue
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    errorType: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      default: "", // Full stack trace text
    },
    url: {
      type: String,
      default: "", // Webpage URL where crash happened
    },
    userAgent: {
      type: String,
      default: "", // Raw browser string
    },
    browser: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "Unknown" },
    },
    os: {
      name: { type: String, default: "Unknown" },
      version: { type: String, default: "Unknown" },
    },
    user: {
      id: { type: String },
      email: { type: String },
      ipAddress: { type: String },
    },
    extra: {
      type: Schema.Types.Mixed, // Stores custom extra JSON context
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// ⚡ TTL INDEX: Auto-deletes individual logs after 30 days (2,592,000 seconds)
// Keeps your database clean and light automatically!
exceptionEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model<IExceptionEventDocument>(
  "ExceptionEvent",
  exceptionEventSchema
);
