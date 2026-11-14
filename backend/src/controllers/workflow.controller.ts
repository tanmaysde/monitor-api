import { Response } from "express";
import mongoose from "mongoose";
import Workflow from "../models/Workflow";
import Monitor from "../models/Monitor";
import WorkflowExecution from "../models/WorkflowExecution";
import { WorkspaceRequest } from "../middlewares/rbac";
import {
  normalizeWorkflowActions,
  validateWorkflowActions,
} from "../utils/actionValidation";
import { runWorkflowTest } from "../services/workflow.service";
import { pick } from "../utils/pick";

// Only these fields may be set by a client (never workspaceId, timestamps, ...).
const WORKFLOW_WRITABLE_FIELDS = ["name", "trigger", "monitorIds", "conditions", "actions", "enabled"] as const;

const MAX_SCOPED_MONITORS = 100;

/**
 * Checks the optional monitorIds list: an array of valid ids, all belonging to the
 * caller's workspace (so nobody can attach another tenant's monitor). Returns the
 * de-duplicated ids, or an error message.
 */
const validateMonitorIds = async (
  value: unknown,
  workspaceId: mongoose.Types.ObjectId
): Promise<{ ids: string[] } | { error: string }> => {
  if (!Array.isArray(value)) return { error: "'monitorIds' must be an array" };
  if (value.length > MAX_SCOPED_MONITORS) {
    return { error: `A workflow can be scoped to at most ${MAX_SCOPED_MONITORS} monitors` };
  }
  if (!value.every((id) => typeof id === "string" && mongoose.isValidObjectId(id))) {
    return { error: "'monitorIds' must contain valid monitor ids" };
  }

  const ids = Array.from(new Set(value as string[]));
  if (ids.length === 0) return { ids };

  const found = await Monitor.countDocuments({ _id: { $in: ids }, workspaceId });
  if (found !== ids.length) {
    return { error: "One or more monitors were not found in this workspace" };
  }
  return { ids };
};

export const createWorkflow = async (req: WorkspaceRequest, res: Response) => {
  try {
    const data = pick(req.body, WORKFLOW_WRITABLE_FIELDS);

    const actionsError = validateWorkflowActions(data.actions || []);
    if (actionsError) {
      return res.status(400).json({ message: actionsError });
    }

    if (data.monitorIds !== undefined) {
      const scope = await validateMonitorIds(data.monitorIds, req.workspace._id);
      if ("error" in scope) return res.status(400).json({ message: scope.error });
      data.monitorIds = scope.ids;
    }

    const workflow = await Workflow.create({
      ...data,
      actions: normalizeWorkflowActions(data.actions || []),
      workspaceId: req.workspace._id,
    });

    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflows = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workflows = await Workflow.find({ workspaceId: req.workspace._id }).sort({
      createdAt: -1,
    });

    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkflow = async (req: WorkspaceRequest, res: Response) => {
  try {
    // Use ONLY whitelisted fields (never the raw request body)
    const data = pick(req.body, WORKFLOW_WRITABLE_FIELDS);

    if (data.actions !== undefined) {
      const actionsError = validateWorkflowActions(data.actions);
      if (actionsError) {
        return res.status(400).json({ message: actionsError });
      }

      data.actions = normalizeWorkflowActions(data.actions);
    }

    if (data.monitorIds !== undefined) {
      const scope = await validateMonitorIds(data.monitorIds, req.workspace._id);
      if ("error" in scope) return res.status(400).json({ message: scope.error });
      data.monitorIds = scope.ids;
    }

    const workflow = await Workflow.findOneAndUpdate(
      {
        _id: req.params.id,
        workspaceId: req.workspace._id,
      },
      { $set: data },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorkflow = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    res.json({ message: "Workflow deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflowExecutions = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [executions, total] = await Promise.all([
        WorkflowExecution.find({ workflowId: workflow._id, workspaceId: req.workspace._id })
          .sort({ executedAt: -1 })
          .skip(skip)
          .limit(limit),
        WorkflowExecution.countDocuments({ workflowId: workflow._id, workspaceId: req.workspace._id })
      ]);

      return res.json({
        data: executions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    const executions = await WorkflowExecution.find({
      workflowId: workflow._id,
      workspaceId: req.workspace._id,
    }).sort({ executedAt: -1 });

    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const testWorkflow = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const execution = await runWorkflowTest(workflow._id);

    res.json({
      message: "Workflow test executed",
      execution,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
