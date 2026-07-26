import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { WorkflowForm } from "../components/WorkflowForm";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { EventType, Workflow, WorkflowExecution } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { TableSkeleton, CardSkeleton, TextSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  GitBranch,
  Plus,
  ArrowLeft,
  Settings,
  Trash2,
  Play,
  Mail,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Terminal,
  Activity,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react";

const emptyWorkflowForm = {
  name: "",
  trigger: "API_DOWN" as EventType,
  enabled: true,
  actionType: "EMAIL" as "EMAIL" | "WEBHOOK" | "SLACK" | "TEAMS",
  to: "",
  subject: "",
  text: "",
  webhookUrl: "",
  webhookHeadersJson: "{}",
  slackWebhookUrl: "",
  teamsWebhookUrl: "",
};

export function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { userRole, activeWorkspaceId } = useWorkspace();
  const isViewer = userRole === "VIEWER";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [editingWorkflowId, setEditingWorkflowId] = useState("");
  const [form, setForm] = useState(emptyWorkflowForm);

  // Table Directory States
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 8;

  // Modals / Dialogs states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token || !activeWorkspaceId) return;
    void loadPage(token, id);
  }, [id, token, activeWorkspaceId]);

  async function loadPage(currentToken: string, workflowId?: string) {
    try {
      setBusy(true);
      setError("");
      const workflowData = await api.getWorkflows(currentToken);
      setWorkflows(workflowData);

      if (!workflowId) {
        setSelectedWorkflow(null);
        setExecutions([]);
        setEditingWorkflowId("");
        setForm(emptyWorkflowForm);
        return;
      }

      const target = workflowData.find((w) => w._id === workflowId);
      if (!target) {
        navigate("/workflows", { replace: true });
        return;
      }

      setSelectedWorkflow(target);

      const executionData = await api.getWorkflowExecutions(currentToken, target._id);
      setExecutions(executionData);
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
      let actionConfig: any = {};
      if (form.actionType === "EMAIL") {
        actionConfig = {
          to: form.to,
          subject: form.subject,
          text: form.text,
        };
      } else if (form.actionType === "WEBHOOK") {
        let headers = {};
        try {
          headers = JSON.parse(form.webhookHeadersJson || "{}");
        } catch (e) {
          throw new Error("Invalid custom headers JSON format. Please check JSON syntax.");
        }
        actionConfig = {
          url: form.webhookUrl,
          headers,
        };
      } else if (form.actionType === "SLACK") {
        actionConfig = {
          webhookUrl: form.slackWebhookUrl,
        };
      } else if (form.actionType === "TEAMS") {
        actionConfig = {
          webhookUrl: form.teamsWebhookUrl,
        };
      }

      const payload = {
        name: form.name,
        trigger: form.trigger,
        enabled: form.enabled,
        conditions: [],
        actions: [
          {
            type: form.actionType,
            config: actionConfig,
          },
        ],
      };

      const saved = editingWorkflowId
        ? await api.updateWorkflow(token, editingWorkflowId, payload)
        : await api.createWorkflow(token, payload);

      setForm(emptyWorkflowForm);
      setEditingWorkflowId("");
      setIsAddModalOpen(false);

      setStatusMessage(
        editingWorkflowId
          ? `Workflow "${saved.name}" updated successfully.`
          : `Workflow "${saved.name}" created successfully.`
      );

      navigate(`/workflows/${saved._id}`);
      await loadPage(token, saved._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Manual Test Trigger
  async function handleTestWorkflow() {
    if (!token || !selectedWorkflow) return;

    try {
      setBusy(true);
      setError("");
      const response = await api.testWorkflow(token, selectedWorkflow._id);
      setStatusMessage(response.execution.message ?? "Workflow manual test executed successfully.");
      await loadPage(token, selectedWorkflow._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Delete Workflow Action
  async function handleDeleteConfirm() {
    if (!token || !selectedWorkflow) return;

    try {
      setBusy(true);
      setError("");
      await api.deleteWorkflow(token, selectedWorkflow._id);
      setIsDeleteConfirmOpen(false);
      setStatusMessage(`Workflow "${selectedWorkflow.name}" deleted.`);

      const remaining = workflows.filter((w) => w._id !== selectedWorkflow._id);
      if (remaining.length > 0) {
        navigate(`/workflows/${remaining[0]._id}`);
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
    if (!selectedWorkflow) return;
    const action = selectedWorkflow.actions[0];
    const isEmail = action?.type === "EMAIL";
    const isWebhook = action?.type === "WEBHOOK";
    const isSlack = action?.type === "SLACK";
    const isTeams = action?.type === "TEAMS";

    setEditingWorkflowId(selectedWorkflow._id);
    setForm({
      name: selectedWorkflow.name,
      trigger: selectedWorkflow.trigger,
      enabled: selectedWorkflow.enabled,
      actionType: action?.type ?? "EMAIL",
      to: isEmail ? (action?.config as any)?.to ?? "" : "",
      subject: isEmail ? (action?.config as any)?.subject ?? "" : "",
      text: isEmail ? (action?.config as any)?.text ?? "" : "",
      webhookUrl: isWebhook ? (action?.config as any)?.url ?? "" : "",
      webhookHeadersJson: isWebhook ? JSON.stringify((action?.config as any)?.headers ?? {}, null, 2) : "{}",
      slackWebhookUrl: isSlack ? (action?.config as any)?.webhookUrl ?? "" : "",
      teamsWebhookUrl: isTeams ? (action?.config as any)?.webhookUrl ?? "" : "",
    });
    setIsAddModalOpen(true);
  }

  function cancelEdit() {
    setEditingWorkflowId("");
    setForm(emptyWorkflowForm);
    setIsAddModalOpen(false);
  }

  // Bulk Actions
  function handleSelectAll() {
    if (selectedIds.length === filteredWorkflows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWorkflows.map((w) => w._id));
    }
  }

  function handleSelectRow(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((rowId) => rowId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Filtering & Sorting Directory Workflows
  const filteredWorkflows = workflows
    .filter((w) => {
      const action = w.actions[0];
      const targetVal =
        action?.type === "EMAIL"
          ? (action.config as any)?.to
          : action?.type === "WEBHOOK"
          ? (action.config as any)?.url
          : (action?.config as any)?.webhookUrl;
      const matchSearch =
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (targetVal && targetVal.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchTrigger =
        triggerFilter === "ALL" || w.trigger === triggerFilter;
      return matchSearch && matchTrigger;
    })
    .sort((a, b) => {
      let aVal: string = "";
      let bVal: string = "";

      if (sortColumn === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortColumn === "trigger") {
        aVal = a.trigger;
        bVal = b.trigger;
      } else if (sortColumn === "recipient") {
        const aAct = a.actions[0];
        const bAct = b.actions[0];
        const aTarget =
          aAct?.type === "EMAIL"
            ? (aAct.config as any)?.to
            : aAct?.type === "WEBHOOK"
            ? (aAct.config as any)?.url
            : (aAct?.config as any)?.webhookUrl;
        const bTarget =
          bAct?.type === "EMAIL"
            ? (bAct.config as any)?.to
            : bAct?.type === "WEBHOOK"
            ? (bAct.config as any)?.url
            : (bAct?.config as any)?.webhookUrl;
        aVal = (aTarget || "").toLowerCase();
        bVal = (bTarget || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Paginated Workflows
  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
  const paginatedWorkflows = filteredWorkflows.slice(
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

  // Directory view rendering
  const renderDirectoryView = () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Workflow Automations"
          eyebrow="Engine"
          description="Build action templates, manage triggers, and review execution logs."
          actions={
            !isViewer ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingWorkflowId("");
                  setForm(emptyWorkflowForm);
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Workflow
              </Button>
            ) : undefined
          }
        />

        {statusMessage && (
          <div className="p-3 text-xs font-semibold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
            {statusMessage}
          </div>
        )}

        {/* Directory Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-4 rounded-xl shadow-sm">
          <div className="relative flex items-center w-full md:max-w-sm">
            <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows name or recipient..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="w-full md:w-auto px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-650 dark:text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Triggers</option>
              <option value="API_DOWN">API_DOWN</option>
              <option value="API_UP">API_UP</option>
              <option value="SLOW_RESPONSE">SLOW_RESPONSE</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-4 py-2.5 rounded-lg text-xs">
            <span className="font-semibold text-brand-700 dark:text-brand-400">
              {selectedIds.length} workflows selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-500/10 py-1 px-2.5 h-auto"
              onClick={() => {
                const remaining = workflows.filter((w) => !selectedIds.includes(w._id));
                setWorkflows(remaining);
                setStatusMessage(`Removed ${selectedIds.length} workflows from memory.`);
                setSelectedIds([]);
              }}
            >
              Bulk Delete
            </Button>
          </div>
        )}

        {/* Workflows Data Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    {selectedIds.length === filteredWorkflows.length && filteredWorkflows.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Workflow <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 cursor-pointer select-none text-center" onClick={() => handleSort("trigger")}>
                  Trigger Event <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort("recipient")}>
                  Alert Target <ChevronDown className="inline w-3 h-3 ml-0.5" />
                </th>
                <th className="px-5 py-3">Detail / Subject</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-650 dark:text-slate-350 text-xs">
              {busy && workflows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={4} cols={6} />
                  </td>
                </tr>
              ) : paginatedWorkflows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="No automations configured"
                      description="Create an email automation workflow to handle downtime warnings."
                      icon={<GitBranch className="w-8 h-8" />}
                    />
                  </td>
                </tr>
              ) : (
                paginatedWorkflows.map((w) => (
                  <tr
                    key={w._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => handleSelectRow(w._id)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                        {selectedIds.includes(w._id) ? (
                          <CheckSquare className="w-4 h-4 text-brand-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={w.enabled ? "healthy" : "neutral"} className="text-[10px] px-2 py-0">
                        {w.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                      <Link to={`/workflows/${w._id}`} className="hover:text-brand-500 transition-colors">
                        {w.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-center font-semibold text-brand-600 dark:text-brand-400">
                      {w.trigger}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {w.actions[0]?.type === "EMAIL" ? (
                        (w.actions[0]?.config as any)?.to || "—"
                      ) : w.actions[0]?.type === "WEBHOOK" ? (
                        <span className="text-brand-500 font-semibold">[Webhook] {(w.actions[0]?.config as any)?.url || "—"}</span>
                      ) : w.actions[0]?.type === "SLACK" ? (
                        <span className="text-emerald-500 font-semibold">[Slack] {(w.actions[0]?.config as any)?.webhookUrl || "—"}</span>
                      ) : (
                        <span className="text-indigo-500 font-semibold">[Teams] {(w.actions[0]?.config as any)?.webhookUrl || "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 truncate max-w-[200px]" title={w.actions[0]?.type === "EMAIL" ? (w.actions[0]?.config as any)?.subject : "Integration Target"}>
                      {w.actions[0]?.type === "EMAIL" ? (
                        (w.actions[0]?.config as any)?.subject || "—"
                      ) : w.actions[0]?.type === "WEBHOOK" ? (
                        `Headers: ${Object.keys((w.actions[0]?.config as any)?.headers || {}).join(", ") || "None"}`
                      ) : w.actions[0]?.type === "SLACK" ? (
                        "Outbound Slack Blocks"
                      ) : (
                        "Outbound Teams MessageCard"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        <Link
                          to={`/workflows/${w._id}`}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="View execution logs"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </Link>
                        {!isViewer && (
                          <button
                            onClick={() => {
                              setSelectedWorkflow(w);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
              {filteredWorkflows.length} total)
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

        {/* Add/Edit Modal */}
        <Modal isOpen={isAddModalOpen} onClose={cancelEdit} title="Modify Automation Template">
          <WorkflowForm
            form={form}
            editing={Boolean(editingWorkflowId)}
            busy={busy}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={cancelEdit}
          />
        </Modal>

        {/* Delete Confirm */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setSelectedWorkflow(null);
          }}
          onConfirm={async () => {
            if (!token || !selectedWorkflow) return;
            try {
              setBusy(true);
              await api.deleteWorkflow(token, selectedWorkflow._id);
              setIsDeleteConfirmOpen(false);
              setStatusMessage(`Workflow deleted.`);
              await loadPage(token);
            } catch (err) {
              setError(getErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
          title="Delete Workflow"
          message={`Are you sure you want to delete "${selectedWorkflow?.name || ""}"? The automation actions and execution trail will be removed.`}
          confirmText="Delete"
          variant="danger"
          busy={busy}
        />
      </div>
    );
  };

  // Detail view rendering
  const renderDetailView = () => {
    if (!selectedWorkflow) {
      return (
        <EmptyState
          title="Workflow not found"
          description="The requested automation workflow could not be found."
          actionText="Back to directory"
          onAction={() => navigate("/workflows")}
          icon={<AlertCircle className="w-8 h-8" />}
        />
      );
    }

    const detailActions = (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => navigate("/workflows")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Directory
        </Button>
        <Button variant="secondary" size="sm" onClick={handleTestWorkflow} disabled={busy || isViewer}>
          <Play className="w-3.5 h-3.5 mr-1.5" /> Test Automation
        </Button>
        {!isViewer && (
          <>
            <Button variant="secondary" size="sm" onClick={startEdit}>
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </>
        )}
      </div>
    );

    const action = selectedWorkflow.actions[0];
    const successesCount = executions.filter((e) => e.status === "SUCCESS").length;
    const failuresCount = executions.filter((e) => e.status === "FAILED").length;
    const successRatio = executions.length > 0 ? Math.round((successesCount / executions.length) * 100) : 100;

    return (
      <div className="space-y-6">
        
        {/* Detail Title Header */}
        <PageHeader
          title={selectedWorkflow.name}
          eyebrow={
            <div className="flex items-center gap-2">
              <span className="font-bold">Workflows</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-brand-500">{selectedWorkflow.trigger}</span>
            </div>
          }
          description={`Automated template. Status: ${selectedWorkflow.enabled ? "Active polling" : "Disabled"}`}
          actions={detailActions}
        />

        {statusMessage && (
          <div className="p-3 text-xs font-semibold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg border border-brand-100 dark:border-brand-500/20">
            {statusMessage}
          </div>
        )}

        {/* Workflow Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Trigger Event"
            value={selectedWorkflow.trigger}
            icon={<GitBranch className="w-5 h-5 text-brand-500" />}
            trend="Active hook"
            trendType="neutral"
          />
          <StatCard
            title={
              action?.type === "EMAIL"
                ? "Recipient Mail"
                : action?.type === "WEBHOOK"
                ? "Webhook Target"
                : action?.type === "SLACK"
                ? "Slack Webhook"
                : "Teams Webhook"
            }
            value={
              action?.type === "EMAIL"
                ? ((action?.config as any)?.to ? (action.config as any).to.split("@")[0] : "—")
                : "Outgoing Hook"
            }
            icon={action?.type === "EMAIL" ? <Mail className="w-5 h-5 text-slate-500" /> : <Terminal className="w-5 h-5 text-brand-500" />}
            description={
              action?.type === "EMAIL"
                ? ((action?.config as any)?.to || "No email")
                : action?.type === "WEBHOOK"
                ? ((action?.config as any)?.url || "No url")
                : ((action?.config as any)?.webhookUrl || "No webhook url")
            }
            trend={
              action?.type === "EMAIL"
                ? "SMTP target"
                : action?.type === "WEBHOOK"
                ? "HTTP POST webhook"
                : action?.type === "SLACK"
                ? "Slack app channel"
                : "Teams connector"
            }
            trendType="neutral"
          />
          <StatCard
            title="Fires Success"
            value={`${successRatio}%`}
            icon={<CheckCircle className="w-5 h-5 text-healthy-500" />}
            trend={`${successesCount} OK, ${failuresCount} FAIL`}
            trendType="positive"
          />
          <StatCard
            title="Fires Count"
            value={executions.length}
            icon={<Terminal className="w-5 h-5 text-slate-500" />}
            trend="Total runs logged"
            trendType="neutral"
          />
        </div>

        {/* Action Configuration Preview Pane */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-xl p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {action?.type === "EMAIL"
              ? "Email Payload Configuration"
              : action?.type === "WEBHOOK"
              ? "Webhook Destination Configuration"
              : action?.type === "SLACK"
              ? "Slack App Webhook Integration"
              : "Microsoft Teams Connector Integration"}
          </h3>
          {action?.type === "EMAIL" && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50/50 dark:bg-slate-950/60 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-4 text-slate-500">
                <div className="font-mono">
                  <span className="font-bold">Subject:</span> {(action?.config as any)?.subject}
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 min-h-[80px] font-mono text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                {(action?.config as any)?.text || "No email body text configured."}
              </div>
            </div>
          )}
          {action?.type === "WEBHOOK" && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50/50 dark:bg-slate-950/60 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-slate-500">
                <div className="font-mono">
                  <span className="font-bold">Webhook URL:</span> {(action?.config as any)?.url || "—"}
                </div>
              </div>
              <div className="p-4 bg-slate-50/30 dark:bg-slate-950/20 font-mono text-[11px] text-slate-650 dark:text-slate-400 whitespace-pre-wrap">
                <span className="font-bold block mb-1">Custom Headers:</span>
                {JSON.stringify((action?.config as any)?.headers || {}, null, 2)}
              </div>
            </div>
          )}
          {action?.type === "SLACK" && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50/50 dark:bg-slate-950/60 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-slate-500">
                <div className="font-mono">
                  <span className="font-bold">Slack Incoming Webhook:</span> {(action?.config as any)?.webhookUrl || "—"}
                </div>
              </div>
              <div className="p-4 bg-slate-50/30 dark:bg-slate-950/20 text-xs text-slate-500 leading-normal">
                Status change notifications (🔴 Red for down events, 🟢 Green for recovery events) will be formatted into Slack Block Kit payload structures and posted to this incoming webhook.
              </div>
            </div>
          )}
          {action?.type === "TEAMS" && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50/50 dark:bg-slate-950/60 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-slate-500">
                <div className="font-mono">
                  <span className="font-bold">Teams Connector Webhook:</span> {(action?.config as any)?.webhookUrl || "—"}
                </div>
              </div>
              <div className="p-4 bg-slate-50/30 dark:bg-slate-950/20 text-xs text-slate-500 leading-normal">
                Incident status updates will be packaged in the Teams-compatible Connector MessageCard JSON format and delivered to your channel webhook destination.
              </div>
            </div>
          )}
        </div>

        {/* Execution Trail timeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-5 rounded-xl space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Execution Trails</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Chronological history log of triggers and mail delivery statuses</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {executions.length === 0 ? (
              <EmptyState
                title="No executions logged yet"
                description="This workflow has not been executed by the scheduler. Click 'Test Automation' to trigger it manually."
                icon={<Terminal className="w-8 h-8" />}
              />
            ) : (
              executions.map((exec) => (
                <div
                  key={exec._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-850/20 hover:border-slate-200/60 dark:hover:border-slate-800 transition-all duration-150 gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {exec.status === "SUCCESS" ? (
                        <CheckCircle className="w-4 h-4 text-healthy-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger-500" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${
                          exec.status === "SUCCESS" ? "text-healthy-700 dark:text-healthy-400" : "text-danger-700 dark:text-danger-400"
                        }`}>
                          {exec.status === "SUCCESS" ? "Fired OK" : "Failed Delivery"}
                        </span>
                        <Badge variant="neutral" className="text-[9px] px-1 py-0">{exec.trigger}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
                        {exec.message || "Email alert dispatched."}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-450 self-end sm:self-auto">
                    {formatDate(exec.executedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal edit form */}
        <Modal isOpen={isAddModalOpen} onClose={cancelEdit} title="Modify Automation Template">
          <WorkflowForm
            form={form}
            editing={Boolean(editingWorkflowId)}
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
          title="Delete Workflow"
          message={`Are you sure you want to delete "${selectedWorkflow.name}"? The automation actions and execution trail will be removed.`}
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
