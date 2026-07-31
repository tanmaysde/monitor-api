import { Types } from "mongoose";
import { ISSLInfo } from "../services/ssl.service";

export type MonitorType = "HTTP" | "TCP" | "PING" | "DNS";
export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT";

export interface IAssertion {
  type: "STATUS_CODE" | "RESPONSE_TIME" | "TEXT_BODY" | "JSON_PATH";
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "GREATER_THAN" | "LESS_THAN";
  value: string;
  target?: string; // e.g. "$.status" only needed for JSON_PATH
}

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
  type: MonitorType;
  port?: number;                  // TCP port
  dnsRecordType?: DnsRecordType;
  assertions?: IAssertion[];
}
