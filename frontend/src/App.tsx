import { FormEvent, useEffect, useState } from "react";
import { api } from "./lib/api";
import {
  AuthResponse,
  EventType,
  Monitor,
  MonitorAnalyticsResponse,
  MonitorEvent,
  MonitorLog,
  UserProfile,
  Workflow,
  WorkflowExecution,
} from "./types";

type AuthMode = "login" | "register";

const emptyMonitorForm = {
  name: "",
  url: "http://localhost:3000/",
  method: "GET" as Monitor["method"],
  interval: 5,
};

const emptyWorkflowForm = {
  name: "",
  trigger: "API_DOWN" as EventType,
  enabled: true,
  to: "",
  subject: "",
  text: "",
};

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("api-monitor-token"));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem("api-monitor-user");
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  });
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [editingMonitorId, setEditingMonitorId] = useState("");
  const [monitorForm, setMonitorForm] = useState(emptyMonitorForm);
  const [monitorLogs, setMonitorLogs] = useState<MonitorLog[]>([]);
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const [monitorAnalytics, setMonitorAnalytics] = useState<MonitorAnalyticsResponse | null>(null);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [editingWorkflowId, setEditingWorkflowId] = useState("");
  const [workflowForm, setWorkflowForm] = useState(emptyWorkflowForm);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);

  const [statusMessage, setStatusMessage] = useState(
    "Connect the backend, log in, and start monitoring."
  );
  const [errorMessage, setErrorMessage] = useState("");

  const selectedMonitor = monitors.find((monitor) => monitor._id === selectedMonitorId) ?? null;
  const selectedWorkflow =
    workflows.find((workflow) => workflow._id === selectedWorkflowId) ?? null;

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshDashboard(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedMonitorId) {
      return;
    }

    void loadMonitorDetails(token, selectedMonitorId);
  }, [token, selectedMonitorId]);

  useEffect(() => {
    if (!token || !selectedWorkflowId) {
      return;
    }

    void loadWorkflowExecutions(token, selectedWorkflowId);
  }, [token, selectedWorkflowId]);

  async function refreshDashboard(currentToken: string) {
    try {
      setBusy(true);
      setErrorMessage("");
      const [monitorData, workflowData] = await Promise.all([
        api.getMonitors(currentToken),
        api.getWorkflows(currentToken),
      ]);

      setMonitors(monitorData);
      setWorkflows(workflowData);

      if (monitorData.length > 0) {
        setSelectedMonitorId((previous) =>
          monitorData.some((monitor) => monitor._id === previous) ? previous : monitorData[0]._id
        );
      } else {
        setSelectedMonitorId("");
        setMonitorLogs([]);
        setMonitorEvents([]);
        setMonitorAnalytics(null);
      }

      if (workflowData.length > 0) {
        setSelectedWorkflowId((previous) =>
          workflowData.some((workflow) => workflow._id === previous) ? previous : workflowData[0]._id
        );
      } else {
        setSelectedWorkflowId("");
        setWorkflowExecutions([]);
      }

      setStatusMessage("Dashboard synced with the latest backend data.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadMonitorDetails(currentToken: string, monitorId: string) {
    try {
      setBusy(true);
      const [logs, analytics, events] = await Promise.all([
        api.getMonitorLogs(currentToken, monitorId),
        api.getMonitorAnalytics(currentToken, monitorId),
        api.getMonitorEvents(currentToken, monitorId),
      ]);

      setMonitorLogs(logs);
      setMonitorAnalytics(analytics);
      setMonitorEvents(events);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadWorkflowExecutions(currentToken: string, workflowId: string) {
    try {
      setBusy(true);
      const executions = await api.getWorkflowExecutions(currentToken, workflowId);
      setWorkflowExecutions(executions);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setBusy(true);
      setAuthError("");
      setErrorMessage("");

      const response: AuthResponse =
        authMode === "login"
          ? await api.login({ email: authForm.email, password: authForm.password })
          : await api.register(authForm);

      localStorage.setItem("api-monitor-token", response.token);
      localStorage.setItem("api-monitor-user", JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      setAuthForm({ name: "", email: "", password: "" });
      setStatusMessage(authMode === "login" ? "Login successful." : "Account created and logged in.");
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleMonitorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage("");
      const saved = editingMonitorId
        ? await api.updateMonitor(token, editingMonitorId, monitorForm)
        : await api.createMonitor(token, monitorForm);

      setMonitorForm(emptyMonitorForm);
      setEditingMonitorId("");
      setStatusMessage(
        editingMonitorId ? `Monitor "${saved.name}" updated.` : `Monitor "${saved.name}" created.`
      );
      await refreshDashboard(token);
      setSelectedMonitorId(saved._id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleManualCheck(monitor: Monitor) {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      const result = await api.checkMonitor(token, monitor._id);
      setStatusMessage(
        `${monitor.name} checked: ${result.result.status} in ${result.result.responseTime}ms.`
      );
      await refreshDashboard(token);
      await loadMonitorDetails(token, monitor._id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMonitor(id: string) {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      await api.deleteMonitor(token, id);
      if (editingMonitorId === id) {
        setEditingMonitorId("");
        setMonitorForm(emptyMonitorForm);
      }
      setStatusMessage("Monitor deleted.");
      await refreshDashboard(token);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleWorkflowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage("");
      const payload = {
        name: workflowForm.name,
        trigger: workflowForm.trigger,
        enabled: workflowForm.enabled,
        conditions: [],
        actions: [
          {
            type: "EMAIL" as const,
            config: {
              to: workflowForm.to,
              subject: workflowForm.subject,
              text: workflowForm.text,
            },
          },
        ],
      };
      const saved = editingWorkflowId
        ? await api.updateWorkflow(token, editingWorkflowId, payload)
        : await api.createWorkflow(token, payload);

      setWorkflowForm(emptyWorkflowForm);
      setEditingWorkflowId("");
      setStatusMessage(
        editingWorkflowId
          ? `Workflow "${saved.name}" updated.`
          : `Workflow "${saved.name}" created.`
      );
      await refreshDashboard(token);
      setSelectedWorkflowId(saved._id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleTestWorkflow(workflow: Workflow) {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      const response = await api.testWorkflow(token, workflow._id);
      setStatusMessage(response.execution.message ?? "Workflow test executed.");
      await loadWorkflowExecutions(token, workflow._id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteWorkflow(id: string) {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      await api.deleteWorkflow(token, id);
      if (editingWorkflowId === id) {
        setEditingWorkflowId("");
        setWorkflowForm(emptyWorkflowForm);
      }
      setStatusMessage("Workflow deleted.");
      await refreshDashboard(token);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function startMonitorEdit(monitor: Monitor) {
    setEditingMonitorId(monitor._id);
    setSelectedMonitorId(monitor._id);
    setMonitorForm({
      name: monitor.name,
      url: monitor.url,
      method: monitor.method,
      interval: monitor.interval,
    });
    setStatusMessage(`Editing monitor "${monitor.name}".`);
  }

  function cancelMonitorEdit() {
    setEditingMonitorId("");
    setMonitorForm(emptyMonitorForm);
    setStatusMessage("Monitor editor reset.");
  }

  function startWorkflowEdit(workflow: Workflow) {
    const emailAction = workflow.actions[0];
    setEditingWorkflowId(workflow._id);
    setSelectedWorkflowId(workflow._id);
    setWorkflowForm({
      name: workflow.name,
      trigger: workflow.trigger,
      enabled: workflow.enabled,
      to: emailAction?.config.to ?? "",
      subject: emailAction?.config.subject ?? "",
      text: emailAction?.config.text ?? "",
    });
    setStatusMessage(`Editing workflow "${workflow.name}".`);
  }

  function cancelWorkflowEdit() {
    setEditingWorkflowId("");
    setWorkflowForm(emptyWorkflowForm);
    setStatusMessage("Workflow editor reset.");
  }

  function handleLogout() {
    localStorage.removeItem("api-monitor-token");
    localStorage.removeItem("api-monitor-user");
    setToken(null);
    setUser(null);
    setMonitors([]);
    setWorkflows([]);
    setMonitorLogs([]);
    setMonitorEvents([]);
    setMonitorAnalytics(null);
    setWorkflowExecutions([]);
    setSelectedMonitorId("");
    setSelectedWorkflowId("");
    setEditingMonitorId("");
    setEditingWorkflowId("");
    setMonitorForm(emptyMonitorForm);
    setWorkflowForm(emptyWorkflowForm);
    setStatusMessage("Logged out.");
  }

  if (!token || !user) {
    return (
      <div className="shell auth-shell">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Phase 8 Dashboard</p>
            <h1>Monitor APIs, inspect failures, and trigger automations.</h1>
            <p className="lede">
              This frontend talks directly to your Express backend. Sign in, create monitors, inspect
              logs, and manage email workflows from one place.
            </p>
          </div>
          <form className="auth-card" onSubmit={handleAuthSubmit}>
            <h2>{authMode === "login" ? "Sign In" : "Create Account"}</h2>
            {authMode === "register" ? (
              <label>
                Name
                <input
                  value={authForm.name}
                  onChange={(event) => setAuthForm((state) => ({ ...state, name: event.target.value }))}
                  placeholder="Tanmay"
                  required
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((state) => ({ ...state, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((state) => ({ ...state, password: event.target.value }))
                }
                placeholder="********"
                required
              />
            </label>
            {authError ? <p className="error-text">{authError}</p> : null}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Working..." : authMode === "login" ? "Login" : "Register"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setAuthMode((mode) => (mode === "login" ? "register" : "login"))}
            >
              {authMode === "login" ? "Need an account?" : "Already registered?"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">API Monitor Control Room</p>
          <h1>Welcome back, {user.name}</h1>
        </div>
        <div className="topbar-actions">
          <div className="status-pill">{busy ? "Syncing" : "Ready"}</div>
          <button className="ghost-button" type="button" onClick={() => void refreshDashboard(token)}>
            Refresh
          </button>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="banner">
        <div>
          <strong>Status:</strong> {statusMessage}
        </div>
        {errorMessage ? <div className="error-text">{errorMessage}</div> : null}
      </section>

      <main className="dashboard-grid">
        <section className="panel span-two">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Monitors</p>
              <h2>Track live endpoints</h2>
            </div>
            <div className="metric-chip">{monitors.length} total</div>
          </div>

          <form className="stacked-form" onSubmit={handleMonitorSubmit}>
            <div className="section-tools">
              <div className="form-mode">{editingMonitorId ? "Edit monitor" : "Create monitor"}</div>
              {editingMonitorId ? (
                <button className="ghost-button" type="button" onClick={cancelMonitorEdit}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="form-row">
              <label>
                Name
                <input
                  value={monitorForm.name}
                  onChange={(event) =>
                    setMonitorForm((state) => ({ ...state, name: event.target.value }))
                  }
                  placeholder="Primary API"
                  required
                />
              </label>
              <label>
                Method
                <select
                  value={monitorForm.method}
                  onChange={(event) =>
                    setMonitorForm((state) => ({
                      ...state,
                      method: event.target.value as Monitor["method"],
                    }))
                  }
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label className="flex-grow">
                URL
                <input
                  value={monitorForm.url}
                  onChange={(event) =>
                    setMonitorForm((state) => ({ ...state, url: event.target.value }))
                  }
                  placeholder="http://localhost:3000/"
                  required
                />
              </label>
              <label>
                Interval
                <input
                  type="number"
                  min={1}
                  value={monitorForm.interval}
                  onChange={(event) =>
                    setMonitorForm((state) => ({
                      ...state,
                      interval: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={busy}>
              {editingMonitorId ? "Save Monitor" : "Add Monitor"}
            </button>
          </form>

          <div className="list-grid">
            {monitors.map((monitor) => (
              <article
                key={monitor._id}
                className={`list-card ${selectedMonitorId === monitor._id ? "selected" : ""}`}
                onClick={() => setSelectedMonitorId(monitor._id)}
              >
                <div className="list-card-top">
                  <h3>{monitor.name}</h3>
                  <span className={`status-tag status-${monitor.status.toLowerCase()}`}>
                    {monitor.status}
                  </span>
                </div>
                <p>{monitor.url}</p>
                <div className="list-meta">
                  <span>{monitor.method}</span>
                  <span>{monitor.lastResponseTime ?? 0}ms</span>
                </div>
                <div className="inline-actions">
                  <button
                    className="small-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleManualCheck(monitor);
                    }}
                  >
                    Check
                  </button>
                  <button
                    className="small-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startMonitorEdit(monitor);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="small-button danger"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteMonitor(monitor._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Monitor Detail</p>
              <h2>{selectedMonitor?.name ?? "Pick a monitor"}</h2>
            </div>
          </div>
          {selectedMonitor && monitorAnalytics ? (
            <>
              <div className="analytics-grid">
                <div className="stat-card">
                  <span>Uptime</span>
                  <strong>{monitorAnalytics.analytics.uptimePercentage.toFixed(1)}%</strong>
                </div>
                <div className="stat-card">
                  <span>Avg Response</span>
                  <strong>{monitorAnalytics.analytics.averageResponseTime.toFixed(0)}ms</strong>
                </div>
                <div className="stat-card">
                  <span>Failures</span>
                  <strong>{monitorAnalytics.analytics.failureCount}</strong>
                </div>
                <div className="stat-card">
                  <span>Total Checks</span>
                  <strong>{monitorAnalytics.analytics.totalChecks}</strong>
                </div>
              </div>

              <div className="detail-section">
                <h3>Recent Events</h3>
                <ul className="timeline">
                  {monitorEvents.slice(0, 5).map((item) => (
                    <li key={item._id}>
                      <strong>{item.type}</strong>
                      <span>{item.message}</span>
                      <time>{formatDate(item.triggeredAt)}</time>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>Recent Logs</h3>
                <ul className="timeline">
                  {monitorLogs.slice(0, 5).map((item) => (
                    <li key={item._id}>
                      <strong>{item.status}</strong>
                      <span>
                        {item.responseTime}ms
                        {item.statusCode ? ` • HTTP ${item.statusCode}` : ""}
                        {item.errorMessage ? ` • ${item.errorMessage}` : ""}
                      </span>
                      <time>{formatDate(item.checkedAt)}</time>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="muted-text">
              Create or select a monitor to inspect analytics, logs, and events.
            </p>
          )}
        </section>

        <section className="panel span-two">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Workflows</p>
              <h2>Email automation</h2>
            </div>
            <div className="metric-chip">{workflows.length} total</div>
          </div>

          <form className="stacked-form" onSubmit={handleWorkflowSubmit}>
            <div className="section-tools">
              <div className="form-mode">
                {editingWorkflowId ? "Edit workflow" : "Create workflow"}
              </div>
              {editingWorkflowId ? (
                <button className="ghost-button" type="button" onClick={cancelWorkflowEdit}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="form-row">
              <label>
                Name
                <input
                  value={workflowForm.name}
                  onChange={(event) =>
                    setWorkflowForm((state) => ({ ...state, name: event.target.value }))
                  }
                  placeholder="Down Email Alert"
                  required
                />
              </label>
              <label>
                Trigger
                <select
                  value={workflowForm.trigger}
                  onChange={(event) =>
                    setWorkflowForm((state) => ({
                      ...state,
                      trigger: event.target.value as EventType,
                    }))
                  }
                >
                  <option value="API_DOWN">API_DOWN</option>
                  <option value="API_UP">API_UP</option>
                  <option value="SLOW_RESPONSE">SLOW_RESPONSE</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                To
                <input
                  type="email"
                  value={workflowForm.to}
                  onChange={(event) =>
                    setWorkflowForm((state) => ({ ...state, to: event.target.value }))
                  }
                  placeholder="receiver@example.com"
                  required
                />
              </label>
              <label>
                Subject
                <input
                  value={workflowForm.subject}
                  onChange={(event) =>
                    setWorkflowForm((state) => ({ ...state, subject: event.target.value }))
                  }
                  placeholder="API Down Alert"
                  required
                />
              </label>
            </div>
            <label>
              Email Body
              <textarea
                value={workflowForm.text}
                onChange={(event) =>
                  setWorkflowForm((state) => ({ ...state, text: event.target.value }))
                }
                placeholder="The API is down."
                rows={4}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={workflowForm.enabled}
                onChange={(event) =>
                  setWorkflowForm((state) => ({ ...state, enabled: event.target.checked }))
                }
              />
              <span>Workflow enabled</span>
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {editingWorkflowId ? "Save Workflow" : "Add Workflow"}
            </button>
          </form>

          <div className="list-grid">
            {workflows.map((workflow) => (
              <article
                key={workflow._id}
                className={`list-card ${selectedWorkflowId === workflow._id ? "selected" : ""}`}
                onClick={() => setSelectedWorkflowId(workflow._id)}
              >
                <div className="list-card-top">
                  <h3>{workflow.name}</h3>
                  <span className={`status-tag ${workflow.enabled ? "status-up" : "status-down"}`}>
                    {workflow.trigger}
                  </span>
                </div>
                <p>{workflow.actions[0]?.config.to ?? "No recipient"}</p>
                <div className="inline-actions">
                  <button
                    className="small-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleTestWorkflow(workflow);
                    }}
                  >
                    Test
                  </button>
                  <button
                    className="small-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startWorkflowEdit(workflow);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="small-button danger"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteWorkflow(workflow._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Executions</p>
              <h2>{selectedWorkflow?.name ?? "Pick a workflow"}</h2>
            </div>
          </div>
          {selectedWorkflow ? (
            <ul className="timeline">
              {workflowExecutions.slice(0, 8).map((execution) => (
                <li key={execution._id}>
                  <strong className={execution.status === "SUCCESS" ? "ok-text" : "error-text"}>
                    {execution.status}
                  </strong>
                  <span>{execution.message ?? "No message"}</span>
                  <time>{formatDate(execution.executedAt)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">
              Select a workflow to inspect test runs and execution history.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export default App;
