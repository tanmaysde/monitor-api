import mongoose, { Document, Schema } from "mongoose";

export interface IExceptionIssueDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  hash: string;
  errorType: string;
  message: string;
  status: "UNRESOLVED" | "RESOLVED" | "IGNORED";
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  browsers: Map<string, number>;
  os: Map<string, number>;
  urls: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const exceptionIssueSchema = new Schema<IExceptionIssueDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true, // Fast lookup by workspace
    },
    hash: {
      type: String,
      required: true,
    },
    errorType: {
      type: String,
      required: true,
      trim: true,
      default: "Error",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["UNRESOLVED", "RESOLVED", "IGNORED"],
      default: "UNRESOLVED",
      index: true, // Useful for filtering by status in Dashboard
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true, // Useful for sorting "Latest Issues"
    },
    count: {
      type: Number,
      default: 1, // Increments every time a matching error occurs
    },
    // Mongoose Maps: Key-Value storage (e.g. { "Chrome": 15, "Safari": 3 })
    browsers: {
      type: Map,
      of: Number,
      default: {},
    },
    os: {
      type: Map,
      of: Number,
      default: {},
    },
    urls: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);


// ⚡ UNIQUE COMPOUND INDEX: Prevents race conditions!
// A workspace cannot have 2 duplicate Issue documents with the exact same hash.
exceptionIssueSchema.index({ workspaceId: 1, hash: 1 }, { unique: true });

export default mongoose.model<IExceptionIssueDocument>(
  "ExceptionIssue",
  exceptionIssueSchema
);