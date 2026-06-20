import { Types } from "mongoose";
export interface IMonitor {
  name: string;
  url: string;
  method: string;
  interval: number;
  userId: Types.ObjectId;
  status: "UP" | "DOWN" | "UNKNOWN";
  lastCheckedAt?: Date;
  lastResponseTime?: number;
}
