import mongoose, { Document } from "mongoose";
import { IWorkspace } from "../types/workspace.types";

export interface IWorkspaceDocument extends IWorkspace, Document {}

const workspaceMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
      default: "MEMBER",
    },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema<IWorkspaceDocument>(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [workspaceMemberSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IWorkspaceDocument>("Workspace", workspaceSchema);
