import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ExceptionIssue, ExceptionEvent } from "../types";
import {
  ArrowLeft,
  CheckCircle2,
  EyeOff,
  Trash2,
  Globe,
  Monitor,
  Code2,
} from "lucide-react";

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ExceptionIssue | null>(null);
  const [events, setEvents] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIssueDetails = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const issueData = await api.getIssueById(token, id);
      setIssue(issueData);

      const eventsData = await api.getIssueEvents(token, id, 1);
      setEvents(eventsData?.events || []);
    } catch (err: any) {
      setError(err.message || "Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [token, id]);

  const handleStatusUpdate = async (status: "RESOLVED" | "IGNORED" | "UNRESOLVED") => {
    if (!token || !id) return;
    try {
      const updated = await api.updateIssueStatus(token, id, status);
      setIssue(updated);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!token || !id || !window.confirm("Are you sure you want to delete this issue and all its logs?")) return;
    try {
      await api.deleteIssue(token, id);
      navigate("/issues");
    } catch (err: any) {
      alert(err.message || "Failed to delete issue");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading exception details...</div>;
  }

  if (error || !issue) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
        {error || "Issue not found"}
      </div>
    );
  }

  const latestEvent = events && events.length > 0 ? events[0] : null;

  const browserEntries = issue.browsers && typeof issue.browsers === "object"
    ? Object.entries(issue.browsers)
    : [];

  const osEntries = issue.os && typeof issue.os === "object"
    ? Object.entries(issue.os)
    : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/issues"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Exceptions</span>
      </Link>

      {/* Header Block */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-mono text-xs font-bold uppercase tracking-wider">
                {issue.errorType || "Error"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                issue.status === "UNRESOLVED"
                  ? "bg-amber-500/10 text-amber-500"
                  : issue.status === "RESOLVED"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-slate-500/10 text-slate-500"
              }`}>
                {issue.status}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
              {issue.message}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {issue.status !== "RESOLVED" && (
              <button
                onClick={() => handleStatusUpdate("RESOLVED")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolve</span>
              </button>
            )}
            {issue.status !== "IGNORED" && (
              <button
                onClick={() => handleStatusUpdate("IGNORED")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 text-xs font-semibold transition-all"
              >
                <EyeOff className="w-4 h-4" />
                <span>Ignore</span>
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Events Count</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{issue.count || 1}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">First Seen</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {issue.firstSeen ? new Date(issue.firstSeen).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Last Seen</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {issue.lastSeen ? new Date(issue.lastSeen).toLocaleString() : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Hash</span>
            <span className="font-mono text-[10px] text-slate-500 truncate block">
              {issue.hash ? issue.hash.slice(0, 12) + "..." : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stack Trace Container */}
      {latestEvent && latestEvent.stack && (
        <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 space-y-3 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-2 font-sans text-xs font-bold text-slate-300">
              <Code2 className="w-4 h-4 text-brand-400" />
              Stack Trace (Latest Occurrence)
            </span>
            <span className="text-[11px]">{latestEvent.url || ""}</span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-rose-300">
            {latestEvent.stack}
          </pre>
        </div>
      )}

      {/* Breakdowns & Environment Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browsers Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-500" />
            Browser Distribution
          </h3>
          <div className="space-y-3">
            {browserEntries.map(([browserName, cnt]) => {
              const countVal = Number(cnt) || 1;
              const totalCount = issue.count || 1;
              const pct = Math.round((countVal / totalCount) * 100);
              return (
                <div key={browserName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{browserName.replace(/_/g, ".")}</span>
                    <span>{countVal} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operating Systems Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-500" />
            OS Distribution
          </h3>
          <div className="space-y-3">
            {osEntries.map(([osName, cnt]) => {
              const countVal = Number(cnt) || 1;
              const totalCount = issue.count || 1;
              const pct = Math.round((countVal / totalCount) * 100);
              return (
                <div key={osName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{osName.replace(/_/g, ".")}</span>
                    <span>{countVal} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
