import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { Incident } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton, CardSkeleton, TextSkeleton } from "../components/ui/Skeleton";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Shield,
  ArrowLeft,
  Filter,
  Activity
} from "lucide-react";

export function IncidentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [commentInput, setCommentInput] = useState("");
  const [members, setMembers] = useState<any[]>([]);

  const loadData = async (currentToken: string, targetId?: string) => {
    try {
      setBusy(true);
      setError("");
      
      const filterStatus = statusFilter === "ALL" ? undefined : statusFilter;
      const filterSeverity = severityFilter === "ALL" ? undefined : severityFilter;
      const filterAssignee = assigneeFilter === "ALL" ? undefined : assigneeFilter;

      const data = await api.getIncidents(currentToken, filterStatus, filterSeverity, filterAssignee);
      setIncidents(data);

      if (targetId) {
        const detail = await api.getIncidentById(currentToken, targetId);
        setSelectedIncident(detail);
        
        // Fetch workspace members to populate assignment selector
        if (activeWorkspaceId) {
          const res = await api.getWorkspaceMembers(currentToken, activeWorkspaceId);
          setMembers(res.members || []);
        }
      } else {
        setSelectedIncident(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token && activeWorkspaceId) {
      loadData(token, id);
    }
  }, [token, activeWorkspaceId, id, statusFilter, severityFilter, assigneeFilter]);

  const handleAcknowledge = async () => {
    if (!token || !id) return;
    try {
      setBusy(true);
      const res = await api.acknowledgeIncident(token, id);
      setStatusMessage(res.message);
      loadData(token, id);
    } catch (err: any) {
      setError(err.message || "Failed to acknowledge incident");
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!token || !id) return;
    try {
      setBusy(true);
      const res = await api.resolveIncident(token, id);
      setStatusMessage(res.message);
      loadData(token, id);
    } catch (err: any) {
      setError(err.message || "Failed to resolve incident");
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!token || !id || !userId) return;
    try {
      setBusy(true);
      const res = await api.assignIncident(token, id, userId);
      setStatusMessage(res.message);
      loadData(token, id);
    } catch (err: any) {
      setError(err.message || "Failed to assign incident");
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !commentInput.trim()) return;
    try {
      setBusy(true);
      await api.addIncidentComment(token, id, commentInput.trim());
      setCommentInput("");
      loadData(token, id);
    } catch (err: any) {
      setError(err.message || "Failed to add note");
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "TRIGGERED":
        return "bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-950/20 dark:text-danger-400 dark:border-danger-900/30";
      case "ACKNOWLEDGED":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "RESOLVED":
        return "bg-healthy-50 text-healthy-750 border-healthy-200 dark:bg-healthy-950/10 dark:text-healthy-400 dark:border-healthy-900/20";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-danger-500 text-white shadow-danger-500/10";
      case "WARNING":
        return "bg-amber-500 text-slate-900 shadow-amber-500/10";
      case "INFO":
        return "bg-brand-500 text-white shadow-brand-500/10";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getDurationText = (inc: Incident) => {
    const start = new Date(inc.createdAt).getTime();
    const end = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : Date.now();
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    
    if (diffMinutes < 1) return "Less than a minute";
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    
    const hours = Math.floor(diffMinutes / 60);
    const remainingMins = diffMinutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // 1. RENDER DIRECTORY VIEW (LIST)
  const renderDirectoryView = () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Incident Manager"
          eyebrow="Operations"
          description="Track critical monitor outages, acknowledge incidents, and log resolutions."
        />

        {statusMessage && (
          <div className="p-3 text-xs font-semibold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
            {statusMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-855 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="TRIGGERED">Triggered</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-855 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-855 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none"
              >
                <option value="ALL">All Assignees</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Incident Description</th>
                <th className="px-5 py-3">Target Endpoint</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3 text-right">Triggered</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-650 dark:text-slate-350 text-xs">
              {busy && incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={4} cols={7} />
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="No matching incidents"
                      description="All systems are operating normally in this workspace."
                      icon={<CheckCircle className="w-8 h-8 text-healthy-500" />}
                    />
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeClass(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-850 dark:text-slate-100">
                      {inc.title}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px]">
                      {inc.monitorId?.name || "Deleted Monitor"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {inc.assignedTo?.name || "Unassigned"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-450">
                      {new Date(inc.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/incidents/${inc._id}`}
                        className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                      >
                        Investigate
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 2. RENDER DETAIL VIEW
  const renderDetailView = () => {
    if (!selectedIncident) {
      return (
        <div className="p-6">
          <TextSkeleton lines={3} />
        </div>
      );
    }

    const { title, status, severity, assignedTo, timeline, comments, createdAt } = selectedIncident;

    return (
      <div className="space-y-6">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-850 pb-5">
          <div className="space-y-2">
            <button
              onClick={() => navigate("/incidents")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to directory
            </button>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeClass(status)}`}>
                {status}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white ${getSeverityBadgeClass(severity)}`}>
                {severity}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">Target URL: {selectedIncident.monitorId?.url || "N/A"}</span>
            </div>
          </div>

          {/* Quick incident action controls */}
          <div className="flex items-center gap-2">
            {status === "TRIGGERED" && (
              <Button variant="primary" size="sm" onClick={handleAcknowledge} disabled={busy}>
                <User className="w-4 h-4 mr-1.5" /> Acknowledge
              </Button>
            )}
            {status !== "RESOLVED" && (
              <Button variant="primary" size="sm" onClick={handleResolve} disabled={busy}>
                <CheckCircle className="w-4 h-4 mr-1.5" /> Resolve Incident
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-danger-700 bg-danger-50 dark:bg-danger-950/20 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Timeline log */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Activity History Timeline
              </h3>
              
              {/* Visual Vertical Timeline tree */}
              <div className="relative pl-5 border-l-2 border-slate-100 dark:border-slate-800 space-y-6">
                {timeline.map((event, index) => (
                  <div key={index} className="relative">
                    {/* Circle marker on border line */}
                    <div className={`absolute -left-[27px] top-0.5 w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 ${
                      event.status === "TRIGGERED"
                        ? "border-danger-500"
                        : event.status === "ACKNOWLEDGED"
                        ? "border-amber-500"
                        : "border-healthy-500"
                    }`} />
                    
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {event.action}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleString()}
                        {event.userId && ` by ${(event.userId as any).name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Assignee card and Notes */}
          <div className="lg:col-span-5 space-y-6">
            {/* Assignee Card */}
            <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Incident Metadata
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Triggered At:</span>
                  <span className="font-semibold">{new Date(createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Assigned Owner:</span>
                  <select
                    value={assignedTo?._id || ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={busy || status === "RESOLVED"}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member: any) => {
                      const u = member.userId;
                      if (!u) return null;
                      return (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono text-[10px]">Email:</span>
                  <span className="font-mono text-slate-500 text-[10px]">{assignedTo?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{getDurationText(selectedIncident)}</span>
                </div>
              </div>
            </div>

            {/* Comments Thread */}
            <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Collaborative Notes ({comments.length})
              </h3>
              
              {/* Comment Thread List */}
              <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                {comments.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">
                    No troubleshooting comments have been left. Write one below.
                  </p>
                ) : (
                  comments.map((comment, index) => (
                    <div key={index} className="pt-3 flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {comment.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{comment.userName}</span>
                          <span className="text-slate-400">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-650 dark:text-slate-350 break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              {status !== "RESOLVED" && (
                <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                  <textarea
                    rows={2}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Enter incident updates, resolution details, or root cause logs..."
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400"
                    required
                    disabled={busy}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="primary" loading={busy}>
                      Post Update
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return id ? renderDetailView() : renderDirectoryView();
}
