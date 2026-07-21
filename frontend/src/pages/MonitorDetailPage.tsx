import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MonitorForm } from "../components/MonitorForm";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  Monitor,
  MonitorAnalyticsResponse,
  MonitorEvent,
  MonitorLog,
  MonitorStatus
} from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { TableSkeleton, CardSkeleton, TextSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  Activity,
  Plus,
  ArrowLeft,
  Settings,
  Trash2,
  Play,
  Calendar,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp
} from "lucide-react";

const emptyMonitorForm = {
  name: "",
  url: "http://localhost:3000/",
  method: "GET" as Monitor["method"],
  interval: 5,
};

export function MonitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [analytics, setAnalytics] = useState<MonitorAnalyticsResponse | null>(null);
  const [editingMonitorId, setEditingMonitorId] = useState("");
  const [form, setForm] = useState(emptyMonitorForm);

  // Table Directory States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 8;

  // Modals / Dialogs states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Pagination States for Logs
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogsPages, setTotalLogsPages] = useState(1);

  // Pagination States for Events
  const [eventsPage, setEventsPage] = useState(1);
  const [totalEventsPages, setTotalEventsPages] = useState(1);


  useEffect(() => {
    if (!token) return;
    void loadPage(token, id);
  }, [id, token]);

  async function loadPage(currentToken: string, monitorId?: string) {
    try {
      setBusy(true);
      setError("");
      const monitorData = await api.getMonitors(currentToken);
      setMonitors(monitorData);

      if (!monitorId) {
        setSelectedMonitor(null);
        setLogs([]);
        setEvents([]);
        setAnalytics(null);
        setEditingMonitorId("");
        setForm(emptyMonitorForm);
        return;
      }

      const target = monitorData.find((m) => m._id === monitorId);
      if (!target) {
        navigate("/monitors", { replace: true });
        return;
      }

      setSelectedMonitor(target);
      setLogsPage(1);
      setEventsPage(1);

      const [logRes, analyticsData, eventRes] = await Promise.all([
        api.getMonitorLogs(currentToken, target._id, 1, 8),
        api.getMonitorAnalytics(currentToken, target._id),
        api.getMonitorEvents(currentToken, target._id, 1, 8),
      ]);

      setLogs(logRes.data);
      setTotalLogsPages(logRes.pagination.pages);
      setEvents(eventRes.data);
      setTotalEventsPages(eventRes.pagination.pages);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function fetchLogsPage(pageNumber: number) {
    if (!token || !selectedMonitor) return;
    try {
      setBusy(true);
      const res = await api.getMonitorLogs(token, selectedMonitor._id, pageNumber, 8);
      setLogs(res.data);
      setLogsPage(pageNumber);
      setTotalLogsPages(res.pagination.pages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function fetchEventsPage(pageNumber: number) {
    if (!token || !selectedMonitor) return;
    try {
      setBusy(true);
      const res = await api.getMonitorEvents(token, selectedMonitor._id, pageNumber, 8);
      setEvents(res.data);
      setEventsPage(pageNumber);
      setTotalEventsPages(res.pagination.pages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Handle Form Submit
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      setBusy(true);
      setError("");
      const saved = editingMonitorId
        ? await api.updateMonitor(token, editingMonitorId, form)
        : await api.createMonitor(token, form);

      setForm(emptyMonitorForm);
      setEditingMonitorId("");
      setIsAddModalOpen(false);
      
      setStatusMessage(
        editingMonitorId
          ? `Monitor "${saved.name}" updated successfully.`
          : `Monitor "${saved.name}" created successfully.`
      );
      
      navigate(`/monitors/${saved._id}`);
      await loadPage(token, saved._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Manual Check Trigger
  async function handleManualCheck() {
    if (!token || !selectedMonitor) return;

    try {
      setBusy(true);
      setError("");
      const result = await api.checkMonitor(token, selectedMonitor._id);
      setStatusMessage(
        `${selectedMonitor.name} checked: ${result.result.status} in ${result.result.responseTime}ms.`
      );
      await loadPage(token, selectedMonitor._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Delete Monitor Action
  async function handleDeleteConfirm() {
    if (!token || !selectedMonitor) return;

    try {
      setBusy(true);
      setError("");
      await api.deleteMonitor(token, selectedMonitor._id);
      setIsDeleteConfirmOpen(false);
      setStatusMessage(`Monitor "${selectedMonitor.name}" deleted.`);
      
      const remaining = monitors.filter((m) => m._id !== selectedMonitor._id);
      if (remaining.length > 0) {
        navigate(`/monitors/${remaining[0]._id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    if (!selectedMonitor) return;
    setEditingMonitorId(selectedMonitor._id);
    setForm({
      name: selectedMonitor.name,
      url: selectedMonitor.url,
      method: selectedMonitor.method,
      interval: selectedMonitor.interval,
    });
    setIsAddModalOpen(true);
  }

  function cancelEdit() {
    setEditingMonitorId("");
    setForm(emptyMonitorForm);
    setIsAddModalOpen(false);
  }

  // Bulk Actions
  function handleSelectAll() {
    if (selectedIds.length === filteredMonitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMonitors.map((m) => m._id));
    }
  }

  function handleSelectRow(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((rowId) => rowId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Filtering & Sorting Directory Monitors
  const filteredMonitors = monitors
    .filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "ALL" || m.status === statusFilter;
      const matchMethod =
        methodFilter === "ALL" || m.method === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    })
    .sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortColumn === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortColumn === "url") {
        aVal = a.url.toLowerCase();
        bVal = b.url.toLowerCase();
      } else if (sortColumn === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortColumn === "responseTime") {
        aVal = a.lastResponseTime || 0;
        bVal = b.lastResponseTime || 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Paginated Monitors
  const totalPages = Math.ceil(filteredMonitors.length / itemsPerPage);
  const paginatedMonitors = filteredMonitors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Sorting Handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Directory View rendering
  const renderDirectoryView = () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monitors Console"
          eyebrow="Directory"
          description="Manage checker endpoints, configure polling, and inspect latency signals."
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingMonitorId("");
                setForm(emptyMonitorForm);
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Monitor
            </Button>
          }
        />

        {statusMessage && (
          <div className="p-3 text-xs font-semibold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
            {statusMessage}
          </div>
        )}

        {/* Directory Controls (Search & Filters) */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-4 rounded-xl shadow-sm">
          <div className="relative flex items-center w-full md:max-w-sm">
            <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search monitors name or URL..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs w-full md:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="ALL">All Status</option>
                <option value="UP">UP</option>
                <option value="DOWN">DOWN</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full md:w-auto px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-4 py-2.5 rounded-lg text-xs">
            <span className="font-semibold text-brand-700 dark:text-brand-400">
              {selectedIds.length} monitors selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 py-1 px-2.5 h-auto"
              onClick={() => {
                setStatusMessage(`Bulk checked ${selectedIds.length} monitors.`);
                setSelectedIds([]);
              }}
            >
              Bulk Check
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-500/10 py-1 px-2.5 h-auto"
              onClick={() => {
                const remaining = monitors.filter((m) => !selectedIds.includes(m._id));
                setMonitors(remaining);
                setStatusMessage(`Removed ${selectedIds.length} checkers from memory.`);
                setSelectedIds([]);
              }}
            >
              Bulk Delete
            </Button>
          </div>
        )}

        {/* Monitors Data Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    {selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort("status")}>
                  Status <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Monitor <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort("url")}>
                  URL <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 text-center">Type</th>
                <th className="px-5 py-3 cursor-pointer select-none text-right" onClick={() => handleSort("responseTime")}>
                  Latency <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 text-right">Interval</th>
                <th className="px-5 py-3 text-center">SSL</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-650 dark:text-slate-350 text-xs">
              {busy && monitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <TableSkeleton rows={4} cols={8} />
                  </td>
                </tr>
              ) : paginatedMonitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState
                      title="No matching monitors found"
                      description="Try adjusting your filters, searching another string, or creating a new checker endpoint."
                      icon={<Activity className="w-8 h-8" />}
                    />
                  </td>
                </tr>
              ) : (
                paginatedMonitors.map((m) => (
                  <tr
                    key={m._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => handleSelectRow(m._id)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                        {selectedIds.includes(m._id) ? (
                          <CheckSquare className="w-4 h-4 text-brand-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                      <Link to={`/monitors/${m._id}`} className="hover:text-brand-500 transition-colors">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 max-w-[180px] truncate" title={m.url}>
                      {m.url}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="neutral">{m.method}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">
                      {m.lastResponseTime !== undefined && m.lastResponseTime > 0
                        ? `${m.lastResponseTime}ms`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[10px]">
                      {m.interval}s
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="healthy" className="text-[10px] px-1.5 py-0 bg-healthy-50/50">Active</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        <Link
                          to={`/monitors/${m._id}`}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="View analytics"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedMonitor(m);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Delete checker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-850 pt-4 px-2 text-xs">
            <span className="text-slate-400">
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
              {filteredMonitors.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="py-1 px-2.5 h-auto text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="py-1 px-2.5 h-auto text-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Create/Edit Modal Overlay */}
        <Modal isOpen={isAddModalOpen} onClose={cancelEdit} title="Add Monitor Checker">
          <MonitorForm
            form={form}
            editing={Boolean(editingMonitorId)}
            busy={busy}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={cancelEdit}
          />
        </Modal>

        {/* Delete Confirm dialogue */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setSelectedMonitor(null);
          }}
          onConfirm={async () => {
            if (!token || !selectedMonitor) return;
            try {
              setBusy(true);
              await api.deleteMonitor(token, selectedMonitor._id);
              setIsDeleteConfirmOpen(false);
              setStatusMessage(`Monitor deleted.`);
              await loadPage(token);
            } catch (err) {
              setError(getErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
          title="Delete Monitor"
          message={`Are you sure you want to delete "${selectedMonitor?.name || ""}"? This checker and all latency/event history logs will be permanently deleted.`}
          confirmText="Delete"
          variant="danger"
          busy={busy}
        />
      </div>
    );
  };

  // Detail View Rendering
  const renderDetailView = () => {
    if (!selectedMonitor) {
      return (
        <EmptyState
          title="Monitor not found"
          description="The requested API checker could not be found. Go back to directory list."
          actionText="Back to console"
          onAction={() => navigate("/monitors")}
          icon={<AlertCircle className="w-8 h-8" />}
        />
      );
    }

    const detailActions = (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => navigate("/monitors")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Directory
        </Button>
        <Button variant="secondary" size="sm" onClick={handleManualCheck} disabled={busy}>
          <Play className="w-3.5 h-3.5 mr-1.5" /> Check Now
        </Button>
        <Button variant="secondary" size="sm" onClick={startEdit}>
          <Settings className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
        </Button>
      </div>
    );

    // Compute uptime box stats (30 blocks of recent statuses)
    const blocksCount = 30;
    // Take the 30 most recent logs (logs is sorted newest-first) and reverse to oldest-first
    const recentLogs = logs.slice(0, blocksCount).reverse();
    const unknownPaddingCount = Math.max(0, blocksCount - recentLogs.length);
    const uptimeBlocks: ("UP" | "DOWN" | "UNKNOWN")[] = [
      ...Array(unknownPaddingCount).fill("UNKNOWN"),
      ...recentLogs.map((l) => l.status),
    ];

    // Latency Line Chart - Custom SVG visual latency lines
    const lastLogs = logs.slice(0, 10).reverse();
    const maxVal = Math.max(...lastLogs.map((l) => l.responseTime), 200);

    return (
      <div className="space-y-6">
        
        {/* Detail Title Header */}
        <PageHeader
          title={selectedMonitor.name}
          eyebrow={
            <div className="flex items-center gap-2">
              <span className="font-bold">Monitors</span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-[10px] text-slate-500">{selectedMonitor.method}</span>
            </div>
          }
          description={`Polling path: ${selectedMonitor.url} at ${selectedMonitor.interval}s intervals`}
          actions={detailActions}
        />

        {statusMessage && (
          <div className="p-3 text-xs font-semibold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
            {statusMessage}
          </div>
        )}

        {/* Analytics Grid */}
        {analytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Uptime Ratio"
              value={`${analytics.analytics.uptimePercentage.toFixed(1)}%`}
              icon={<TrendingUp className="w-5 h-5 text-healthy-500" />}
              trend="Check history"
              trendType="positive"
            />
            <StatCard
              title="Average Latency"
              value={`${analytics.analytics.averageResponseTime.toFixed(0)}ms`}
              icon={<Clock className="w-5 h-5 text-brand-500" />}
              trend="Network delay"
              trendType="neutral"
            />
            <StatCard
              title="Incident Count"
              value={analytics.analytics.failureCount}
              icon={<AlertCircle className="w-5 h-5 text-danger-500" />}
              trend="Failures recorded"
              trendType={analytics.analytics.failureCount > 0 ? "negative" : "positive"}
            />
            <StatCard
              title="Total Pings"
              value={analytics.analytics.totalChecks}
              icon={<Database className="w-5 h-5 text-slate-500" />}
              trend="Logs database"
              trendType="neutral"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Visual Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Uptime Blocks History & Latency Graph */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status History Bar grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Uptime History (Last 30 checks)
                </h3>
              </div>
              <div className="flex items-center justify-between gap-1 py-2">
                {uptimeBlocks.map((blockStatus, index) => {
                  const colors = {
                    UP: "bg-healthy-500 hover:bg-healthy-600",
                    DOWN: "bg-danger-500 hover:bg-danger-600",
                    UNKNOWN: "bg-slate-200 dark:bg-slate-800",
                  };
                  return (
                    <div
                      key={index}
                      className={`flex-1 h-9 rounded-md transition-all duration-150 ${colors[blockStatus]}`}
                      title={`Tick #${index + 1}: ${blockStatus}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>30 checks ago</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded bg-healthy-500" /> UP
                  <span className="inline-block w-2.5 h-2.5 rounded bg-danger-500 ml-2" /> DOWN
                </span>
                <span>Just now</span>
              </div>
            </div>

            {/* Custom Latency SVG Graph */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Latency Graph (Last 10 checks)
              </h3>
              {lastLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No checks logged yet to populate Latency Graph.
                </div>
              ) : (
                <div className="relative pt-2">
                  {/* Visual SVG line */}
                  <svg className="w-full h-32 text-brand-500/20" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area path */}
                    <path
                      d={`M 0 30 ${lastLogs
                        .map((l, i) => `L ${(i / (lastLogs.length - 1)) * 100} ${30 - (l.responseTime / maxVal) * 25}`)
                        .join(" ")} L 100 30 Z`}
                      fill="url(#latencyGrad)"
                    />
                    {/* Line path */}
                    <path
                      d={lastLogs
                        .map(
                          (l, i) =>
                            `${i === 0 ? "M" : "L"} ${(i / (lastLogs.length - 1)) * 100} ${
                              30 - (l.responseTime / maxVal) * 25
                            }`
                        )
                        .join(" ")}
                      fill="none"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="0.8"
                    />
                  </svg>
                  {/* SVG Nodes */}
                  <div className="absolute inset-0 pt-2 flex justify-between">
                    {lastLogs.map((l, i) => (
                      <div
                        key={l._id}
                        className="group flex flex-col items-center justify-end relative h-32 w-10 text-center"
                      >
                        {/* Hover Tooltip tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg transition-opacity duration-200 pointer-events-none z-10 shrink-0">
                          {l.responseTime}ms
                        </div>
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900 absolute"
                          style={{
                            bottom: `${(l.responseTime / maxVal) * 25 + 10}px`,
                            left: "50%",
                            transform: "translateX(-50%)",
                          }}
                        />
                        <span className="text-[9px] text-slate-400 mt-2 absolute bottom-0 font-mono">
                          {new Date(l.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Details / Timelines side panels */}
          <div className="space-y-6">
            
            {/* Meta Data stats card / SSL Checker Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  SSL / TLS Certificate
                </h3>
                {selectedMonitor.sslInfo?.isHttps && selectedMonitor.sslInfo.isValid && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Valid
                  </span>
                )}
                {selectedMonitor.sslInfo?.isHttps && selectedMonitor.sslInfo.isExpired && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Expired
                  </span>
                )}
                {!selectedMonitor.sslInfo?.isHttps && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    HTTP (No SSL)
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {selectedMonitor.sslInfo?.isHttps ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Days Remaining</span>
                      <span className={`font-semibold ${
                        (selectedMonitor.sslInfo.daysRemaining ?? 0) <= 14 
                          ? "text-amber-500" 
                          : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {selectedMonitor.sslInfo.daysRemaining !== undefined 
                          ? `${selectedMonitor.sslInfo.daysRemaining} days` 
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Issuer</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {selectedMonitor.sslInfo.issuer || "Unknown"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Valid Until</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedMonitor.sslInfo.validTo 
                          ? new Date(selectedMonitor.sslInfo.validTo).toLocaleDateString() 
                          : "N/A"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-2 text-slate-400 text-[11px]">
                    This monitor target uses standard HTTP. Perform a check to update SSL metrics if updated to HTTPS.
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-slate-450">Target Host</span>
                  <a
                    href={selectedMonitor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-500 hover:underline flex items-center gap-0.5"
                  >
                    Target <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Timeline Events Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Incident Log Events
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => fetchEventsPage(eventsPage - 1)}
                    disabled={eventsPage === 1 || busy}
                    className="p-1 border border-slate-200/65 dark:border-slate-800 disabled:opacity-50 text-[10px] font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {eventsPage}/{totalEventsPages}
                  </span>
                  <button
                    onClick={() => fetchEventsPage(eventsPage + 1)}
                    disabled={eventsPage === totalEventsPages || busy}
                    className="p-1 border border-slate-200/65 dark:border-slate-800 disabled:opacity-50 text-[10px] font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>

              {events.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No critical incidents logs.</p>
              ) : (
                <div className="relative border-l border-slate-100 dark:border-slate-800 pl-3.5 space-y-4 max-h-72 overflow-y-auto">
                  {events.map((item) => (
                    <div key={item._id} className="relative">
                      {/* Timeline marker */}
                      <span className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                        item.type === "API_DOWN" ? "bg-danger-500" : "bg-healthy-500"
                      }`} />
                      <div className="text-xs">
                        <strong className="text-slate-800 dark:text-slate-200 block">{item.type}</strong>
                        <p className="text-slate-450 dark:text-slate-450 mt-0.5 leading-snug">{item.message}</p>
                        <time className="text-[9px] text-slate-400 font-mono mt-1 block">{formatDate(item.triggeredAt)}</time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Recent Ping Logs Table list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Historical Check Trails</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Full logs recorded by automatic checking engine</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => fetchLogsPage(logsPage - 1)}
                disabled={logsPage === 1 || busy}
                className="p-1 border border-slate-200/65 dark:border-slate-800 disabled:opacity-50 text-[10px] font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                Prev
              </button>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {logsPage}/{totalLogsPages}
              </span>
              <button
                onClick={() => fetchLogsPage(logsPage + 1)}
                disabled={logsPage === totalLogsPages || busy}
                className="p-1 border border-slate-200/65 dark:border-slate-800 disabled:opacity-50 text-[10px] font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto pr-2">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No logs recorded yet. Run a checker trigger above or wait.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      log.status === "UP" ? "bg-healthy-500" : "bg-danger-500"
                    }`} />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {log.status === "UP" ? "Success check" : "Failure incident"}
                        </span>
                        <Badge variant={log.status === "UP" ? "healthy" : "danger"} className="text-[9px] px-1 py-0">
                          HTTP {log.statusCode || "—"}
                        </Badge>
                      </div>
                      {log.errorMessage && (
                        <p className="text-[10px] text-danger-600 dark:text-danger-400 font-mono">
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-450 shrink-0 self-end sm:self-auto">
                    <span>{log.responseTime}ms</span>
                    <span>{formatDate(log.checkedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal edit form */}
        <Modal isOpen={isAddModalOpen} onClose={cancelEdit} title="Modify Checker Endpoint">
          <MonitorForm
            form={form}
            editing={Boolean(editingMonitorId)}
            busy={busy}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={cancelEdit}
          />
        </Modal>

        {/* Modal delete confirm */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Checker"
          message={`Are you sure you want to delete "${selectedMonitor.name}"? This checker and all latency/event history logs will be permanently deleted.`}
          confirmText="Delete"
          variant="danger"
          busy={busy}
        />
      </div>
    );
  };

  return id ? renderDetailView() : renderDirectoryView();
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error occurred";
}
