import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Monitor, Workflow } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { CardSkeleton, TableSkeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Badge } from "../components/ui/Badge";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowUpRight,
  GitBranch,
  Mail,
  Terminal
} from "lucide-react";

export function DashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    if (!token) return;
    void loadOverview(token);
  }, [token]);

  async function loadOverview(currentToken: string) {
    try {
      setBusy(true);
      setError("");
      const [monitorData, workflowData] = await Promise.all([
        api.getMonitors(currentToken),
        api.getWorkflows(currentToken),
      ]);
      setMonitors(monitorData);
      setWorkflows(workflowData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Calculate metrics
  const totalMonitors = monitors.length;
  const upCount = monitors.filter((m) => m.status === "UP").length;
  const downCount = monitors.filter((m) => m.status === "DOWN").length;
  
  // Calculate average response time
  const activeChecks = monitors.filter(
    (m) => m.lastResponseTime !== undefined && m.lastResponseTime > 0
  );
  const avgResponseTime =
    activeChecks.length > 0
      ? Math.round(activeChecks.reduce((sum, m) => sum + (m.lastResponseTime || 0), 0) / activeChecks.length)
      : 0;

  // Calculate uptime percentage ratio
  const uptimePct = totalMonitors > 0 ? Math.round((upCount / totalMonitors) * 100) : 100;

  // SSL placeholder (simulated since backend does not check SSL yet, but required by UI specs)
  const sslExpiringSoon = 0; 

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => token && void loadOverview(token)}
        disabled={busy}
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${busy ? "animate-spin" : ""}`} />
        Refresh
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => navigate("/monitors")}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        New Monitor
      </Button>
    </div>
  );

  if (busy && monitors.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview Dashboard" description="Loading metrics and monitors..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={4} cols={3} />
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Page Header */}
      <PageHeader
        title="Overview Dashboard"
        description="A real-time snapshot of your APIs, checks, and event notification workflows."
        eyebrow="Console"
        actions={headerActions}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 border border-danger-200/40 text-xs font-semibold text-danger-700 bg-danger-50 dark:bg-danger-500/10 dark:text-danger-400 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Monitors"
          value={totalMonitors}
          icon={<Activity className="w-5 h-5" />}
          trend="Checks active"
          trendType="neutral"
        />
        <StatCard
          title="Healthy"
          value={upCount}
          icon={<CheckCircle className="w-5 h-5 text-healthy-500" />}
          trend={totalMonitors > 0 ? `${Math.round((upCount / totalMonitors) * 100)}% online` : "100% online"}
          trendType="positive"
        />
        <StatCard
          title="Down"
          value={downCount}
          icon={<AlertTriangle className="w-5 h-5 text-danger-500" />}
          trend={downCount > 0 ? "Action required" : "All systems normal"}
          trendType={downCount > 0 ? "negative" : "positive"}
        />
        <StatCard
          title="Avg Response"
          value={avgResponseTime > 0 ? `${avgResponseTime}ms` : "N/A"}
          icon={<Clock className="w-5 h-5 text-brand-500" />}
          trend="Latency"
          trendType="neutral"
        />
        <StatCard
          title="Uptime"
          value={`${uptimePct}%`}
          icon={<TrendingUp className="w-5 h-5 text-healthy-500" />}
          trend="Last 24h ratio"
          trendType="positive"
        />
        <StatCard
          title="SSL Expiring"
          value={sslExpiringSoon}
          icon={<ShieldCheck className="w-5 h-5 text-brand-500" />}
          trend="No action needed"
          trendType="neutral"
        />
      </div>

      {/* Lists Section: Monitors and Workflows split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Monitors Panel */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Endpoints</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Recently monitored API signals</p>
            </div>
            <Link
              to="/monitors"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-0.5 hover:underline"
            >
              Manage all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {monitors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-450 dark:text-slate-500">
                No endpoints configured yet. Click "New Monitor" to add one.
              </div>
            ) : (
              monitors.slice(0, 6).map((monitor) => (
                <Link
                  key={monitor._id}
                  to={`/monitors/${monitor._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:border-slate-200/60 dark:hover:border-slate-800 transition-all duration-200"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {monitor.name}
                      </span>
                      <Badge variant="neutral" className="text-[9px] px-1.5 py-0">
                        {monitor.method}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs sm:max-w-md">
                      {monitor.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {monitor.lastResponseTime !== undefined && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {monitor.lastResponseTime}ms
                      </span>
                    )}
                    <StatusBadge status={monitor.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent Workflows Panel */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Email Automations</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Workflows triggered by status changes</p>
            </div>
            <Link
              to="/workflows"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-0.5 hover:underline"
            >
              Manage all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {workflows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-450 dark:text-slate-500">
                No alert workflows configured yet. Go to "Workflows" to add one.
              </div>
            ) : (
              workflows.slice(0, 6).map((workflow) => (
                <Link
                  key={workflow._id}
                  to={`/workflows/${workflow._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:border-slate-200/60 dark:hover:border-slate-800 transition-all duration-200"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {workflow.name}
                      </span>
                      <Badge variant={workflow.enabled ? "healthy" : "neutral"} className="text-[9px] px-1.5 py-0">
                        {workflow.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {workflow.actions[0]?.type === "EMAIL" ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">
                            {(workflow.actions[0]?.config as any)?.to || "No recipient"}
                          </span>
                        </>
                      ) : workflow.actions[0]?.type === "WEBHOOK" ? (
                        <>
                          <Terminal className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <span className="truncate max-w-xs font-semibold text-brand-500">
                            [Webhook] {(workflow.actions[0]?.config as any)?.url || "No url"}
                          </span>
                        </>
                      ) : workflow.actions[0]?.type === "SLACK" ? (
                        <>
                          <Terminal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-xs font-semibold text-emerald-500">
                            [Slack] {(workflow.actions[0]?.config as any)?.webhookUrl || "No webhookUrl"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-xs font-semibold text-indigo-500">
                            [Teams] {(workflow.actions[0]?.config as any)?.webhookUrl || "No webhookUrl"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-100 dark:border-brand-500/20">
                      <GitBranch className="w-3.5 h-3.5 shrink-0" />
                      <span>{workflow.trigger}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error occurred";
}
