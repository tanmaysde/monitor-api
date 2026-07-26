import { Types } from "mongoose";
import { ISSLInfo } from "../services/ssl.service";

export interface IMonitor {
  name: string;
  url: string;
  method: string;
  interval: number;
  workspaceId: Types.ObjectId; 
  status: "UP" | "DOWN" | "UNKNOWN";
  lastCheckedAt?: Date;
  lastResponseTime?: number;
  sslInfo?: ISSLInfo;
  retries?: number;
  retryInterval?: number;
}
