import mongoose,{Schema, Document} from "mongoose";

export interface IIncidentTimeline {
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
  action: string;
  timestamp: Date;
  userId?: mongoose.Types.ObjectId;
}

export interface IIncidentComment {
  userId: mongoose.Types.ObjectId;
  userName: string;
  content: string;
  timestamp: Date;
}

export interface IIncident extends Document {
  workspaceId: mongoose.Types.ObjectId;
  monitorId: mongoose.Types.ObjectId;
  title: string;
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED";
  severity: "INFO" | "WARNING" | "CRITICAL";
  assignedTo?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  timeline: IIncidentTimeline[];
  comments: IIncidentComment[];
  createdAt: Date;
  updatedAt: Date;
}

const timelineSchema = new Schema<IIncidentTimeline>(
  {
    status: {
      type: String,
      enum: ["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"],
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const commentSchema = new Schema<IIncidentComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const incidentSchema = new Schema<IIncident>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    monitorId: {
      type: Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"],
      default: "TRIGGERED",
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "CRITICAL",
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    timeline: {
      type: [timelineSchema],
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IIncident>("Incident", incidentSchema);