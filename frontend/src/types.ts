export type MonitorStatus = "UP" | "DOWN" | "UNKNOWN";
export type EventType = "API_DOWN" | "API_UP" | "SLOW_RESPONSE";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export interface SSLInfo {
  isHttps: boolean;
  validTo?: string;
  validFrom?: string;
  daysRemaining?: number;
  issuer?: string;
  isValid?: boolean;
  isExpired?: boolean;
  error?: string;
}

export interface Monitor {
  _id: string;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  interval: number;
  userId: string;
  status: MonitorStatus;
  lastCheckedAt?: string;
  lastResponseTime?: number;
  sslInfo?: SSLInfo;
  createdAt: string;
  updatedAt: string;
  retries?: number;
  retryInterval?: number;

}

export interface MonitorLog {
  _id: string;
  monitorId: string;
  userId: string;
  status: "UP" | "DOWN";
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorEvent {
  _id: string;
  monitorId: string;
  userId: string;
  type: EventType;
  message: string;
  previousStatus?: MonitorStatus;
  currentStatus?: "UP" | "DOWN";
  responseTime?: number;
  triggeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorAnalyticsResponse {
  monitorId: string;
  monitorName: string;
  latestStatus: MonitorStatus;
  lastCheckedAt?: string;
  analytics: {
    uptimePercentage: number;
    averageResponseTime: number;
    failureCount: number;
    totalChecks: number;
  };
}

export interface EmailActionConfig {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface WebhookActionConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface SlackActionConfig {
  webhookUrl: string;
}

export interface TeamsActionConfig {
  webhookUrl: string;
}

export interface WorkflowAction {
  type: "EMAIL" | "WEBHOOK" | "SLACK" | "TEAMS";
  config: EmailActionConfig | WebhookActionConfig | SlackActionConfig | TeamsActionConfig;
}

export interface Workflow {
  _id: string;
  name: string;
  userId: string;
  trigger: EventType;
  conditions: Record<string, unknown>[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  _id: string;
  workflowId: string;
  eventId: string;
  monitorId: string;
  userId: string;
  trigger: EventType;
  status: "SUCCESS" | "FAILED";
  actions: WorkflowAction[];
  message?: string;
  executedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorCheckResponse {
  message: string;
  monitor: Monitor;
  result: {
    status: "UP" | "DOWN";
    responseTime: number;
    statusCode?: number;
    checkedAt: string;
    errorMessage?: string;
  };
  events: MonitorEvent[];
}
