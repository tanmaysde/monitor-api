import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { ExceptionIssue } from "../types";
import {
  Bug,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  EyeOff,
  Code2,
  Clock,
  Activity,
  Copy,
  Check,
  X,
} from "lucide-react";

export function IssuesPage() {
  const { token } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  const [issues, setIssues] = useState<ExceptionIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("UNRESOLVED");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("lastSeen");
  const [stats, setStats] = useState<{ unresolvedCount: number; totalCount: number }>({
    unresolvedCount: 0,
    totalCount: 0,
  });
  const [showSdkModal, setShowSdkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchIssues = async () => {
    if (!token || !activeWorkspaceId) return;
    setLoading(true);
    try {
      const data = await api.getIssues(token, statusFilter === "ALL" ? "" : statusFilter, search, sortBy);
      setIssues(data.issues);

      const statsData = await api.getExceptionStats(token);
      setStats({ unresolvedCount: statsData.unresolvedCount, totalCount: statsData.totalCount });
    } catch (err: any) {
      setError(err.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [token, activeWorkspaceId, statusFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleStatusChange = async (e: React.MouseEvent, id: string, newStatus: "RESOLVED" | "IGNORED" | "UNRESOLVED") => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    try {
      await api.updateIssueStatus(token, id, newStatus);
      fetchIssues();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const sdkCodeSnippet = `<script src="http://localhost:5000/api/errors/sdk.js" data-workspace-id="${activeWorkspaceId || "YOUR_WORKSPACE_ID"}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sdkCodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <Bug className="w-7 h-7 text-rose-500" />
            Exceptions (Mini-Sentry)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time client & server unhandled exception tracking and issue grouping.
          </p>
        </div>
        <button
          onClick={() => setShowSdkModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Code2 className="w-4 h-4" />
          <span>Install JavaScript SDK</span>
        </button>
      </div>

      {/* Top Stats Overview Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Unresolved Issues</span>
            <AlertOctagon className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-2">
            {stats.unresolvedCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tracked Issues</span>
            <Activity className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-2">
            {stats.totalCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">SDK Status</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-2">
            Active Workspace: <span className="font-mono text-brand-500 font-bold">{activeWorkspaceId?.slice(0, 8)}...</span>
          </p>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search exceptions by message or error type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          {["UNRESOLVED", "RESOLVED", "IGNORED", "ALL"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
              }`}
            >
              {st}
            </button>
          ))}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="lastSeen">Latest</option>
              <option value="count">Most Frequent</option>
              <option value="firstSeen">Oldest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading exception issues...</div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">{error}</div>
      ) : issues.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No issues found</h3>
          <p className="text-xs text-slate-500 mt-1">Great job! No unhandled exceptions match your criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link
              key={issue._id}
              to={`/issues/${issue._id}`}
              className="group block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {issue.errorType}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      issue.status === "UNRESOLVED"
                        ? "bg-amber-500/10 text-amber-500"
                        : issue.status === "RESOLVED"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-slate-500/10 text-slate-500"
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors truncate mt-1.5">
                    {issue.message}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Last seen: {new Date(issue.lastSeen).toLocaleString()}
                    </span>
                    <span>First seen: {new Date(issue.firstSeen).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 block">
                      {issue.count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Events
                    </span>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    {issue.status !== "RESOLVED" && (
                      <button
                        onClick={(e) => handleStatusChange(e, issue._id, "RESOLVED")}
                        title="Mark Resolved"
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {issue.status !== "IGNORED" && (
                      <button
                        onClick={(e) => handleStatusChange(e, issue._id, "IGNORED")}
                        title="Ignore Issue"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-500/10 transition-colors"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Install SDK Modal */}
      {showSdkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSdkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-brand-500" />
              Install JavaScript SDK
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add this single script tag to your web app's <code className="text-brand-500">&lt;head&gt;</code> to automatically capture unhandled crashes.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] relative group overflow-x-auto">
              <code>{sdkCodeSnippet}</code>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowSdkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
