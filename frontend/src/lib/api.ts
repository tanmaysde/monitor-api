import {
  AuthResponse,
  Monitor,
  MonitorAnalyticsResponse,
  MonitorCheckResponse,
  MonitorEvent,
  MonitorLog,
  Workflow,
  WorkflowExecution,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: input }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: input }),

  getMonitors: (token: string) => request<Monitor[]>("/monitors", { token }),

  createMonitor: (
    token: string,
    input: Pick<Monitor, "name" | "url" | "method" | "interval">
  ) => request<Monitor>("/monitors", { method: "POST", token, body: input }),

  updateMonitor: (
    token: string,
    id: string,
    input: Partial<Pick<Monitor, "name" | "url" | "method" | "interval">>
  ) => request<Monitor>(`/monitors/${id}`, { method: "PUT", token, body: input }),

  deleteMonitor: (token: string, id: string) =>
    request<{ message: string }>(`/monitors/${id}`, { method: "DELETE", token }),

  checkMonitor: (token: string, id: string) =>
    request<MonitorCheckResponse>(`/monitors/${id}/check`, { method: "POST", token }),

  getMonitorLogs: (token: string, id: string, page?: number, limit?: number) => {
    const query = page && limit ? `?page=${page}&limit=${limit}` : "";
    return request<any>(`/monitors/${id}/logs${query}`, { token });
  },

  getMonitorEvents: (token: string, id: string, page?: number, limit?: number) => {
    const query = page && limit ? `?page=${page}&limit=${limit}` : "";
    return request<any>(`/monitors/${id}/events${query}`, { token });
  },

  getMonitorAnalytics: (token: string, id: string) =>
    request<MonitorAnalyticsResponse>(`/monitors/${id}/analytics`, { token }),

  getWorkflows: (token: string) => request<Workflow[]>("/workflows", { token }),

  createWorkflow: (
    token: string,
    input: Pick<Workflow, "name" | "trigger" | "enabled"> & {
      actions: Workflow["actions"];
      conditions?: Workflow["conditions"];
    }
  ) => request<Workflow>("/workflows", { method: "POST", token, body: input }),

  updateWorkflow: (
    token: string,
    id: string,
    input: Partial<Pick<Workflow, "name" | "trigger" | "enabled" | "actions" | "conditions">>
  ) => request<Workflow>(`/workflows/${id}`, { method: "PUT", token, body: input }),

  deleteWorkflow: (token: string, id: string) =>
    request<{ message: string }>(`/workflows/${id}`, { method: "DELETE", token }),

  testWorkflow: (token: string, id: string) =>
    request<{ message: string; execution: WorkflowExecution }>(`/workflows/${id}/test`, {
      method: "POST",
      token,
    }),

  getWorkflowExecutions: (token: string, id: string) =>
    request<WorkflowExecution[]>(`/workflows/${id}/executions`, { token }),
};
