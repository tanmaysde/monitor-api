import { Types } from "mongoose";

export interface ILog {
  monitorId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  status: "UP" | "DOWN";
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  checkedAt: Date;
}