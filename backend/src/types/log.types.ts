import { Types } from "mongoose";

export interface ILog {
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  status: "UP" | "DOWN";
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  checkedAt: Date;
}