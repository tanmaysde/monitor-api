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
  import.meta.env.VITE_API_BASE_URL ?? "https://monitor-api-c77n.onrender.com/api";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Always read latest token from localStorage if not explicitly passed
  const currentToken = options.token ?? localStorage.getItem("api-monitor-token");
  const activeWorkspaceId = localStorage.getItem("api-monitor-workspace-id"); // ⚡ ADD THIS LINE HERE
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(activeWorkspaceId ? { "x-workspace-id": activeWorkspaceId } : {}), // ⚡ ADD THIS
    },
    credentials: "include", 
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  // Handle Token Expiration (401 Unauthorized)
  if (
    response.status === 401 && 
    path !== "/auth/login" && 
    path !== "/auth/register" && 
    path !== "/auth/refresh"
  ) {
    try {
      // 1. Silent request to get a new Access Token
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Sends cookie
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newAccessToken = data.token;
        // 2. Save the new Access Token
        localStorage.setItem("api-monitor-token", newAccessToken);
        // 3. Retry original request with the new Access Token!
        return request<T>(path, { ...options, token: newAccessToken });
      } else {
        // Refresh token has expired/revoked -> Clear local storage & force redirect to login
        localStorage.removeItem("api-monitor-token");
        localStorage.removeItem("api-monitor-user");
        window.location.href = "/";
        throw new Error("Session expired. Please log in again.");
      }
    } catch (refreshErr) {
      localStorage.removeItem("api-monitor-token");
      localStorage.removeItem("api-monitor-user");
      window.location.href = "/";
      throw refreshErr;
    }
  }
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

  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),
  
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

    getWorkspaces: (token: string) => request<any[]>("/workspaces", { token }),
  createWorkspace: (token: string, name: string) =>
    request<any>("/workspaces", { method: "POST", token, body: { name } }),
  getWorkspaceMembers: (token: string, workspaceId: string) =>
    request<any>(`/workspaces/${workspaceId}`, { token }),
  inviteWorkspaceMember: (token: string, workspaceId: string, email: string, role: string) =>
    request<any>(`/workspaces/${workspaceId}/members`, { method: "POST", token, body: { email, role } }),
  updateWorkspaceMemberRole: (token: string, workspaceId: string, memberUserId: string, role: string) =>
    request<any>(`/workspaces/${workspaceId}/members/${memberUserId}`, { method: "PUT", token, body: { role } }),
  removeWorkspaceMember: (token: string, workspaceId: string, memberUserId: string) =>
    request<any>(`/workspaces/${workspaceId}/members/${memberUserId}`, { method: "DELETE", token }),

};
