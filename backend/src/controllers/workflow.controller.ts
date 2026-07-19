import { Response } from "express";
import Workflow from "../models/Workflow";
import WorkflowExecution from "../models/WorkflowExecution";
import { AuthRequest } from "../middlewares/auth";
import {
  normalizeWorkflowActions,
  validateWorkflowActions,
} from "../utils/actionValidation";
import { runWorkflowTest } from "../services/workflow.service";

export const createWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const actionsError = validateWorkflowActions(req.body.actions || []);
    if (actionsError) {
      return res.status(400).json({ message: actionsError });
    }

    const workflow = await Workflow.create({
      ...req.body,
      actions: normalizeWorkflowActions(req.body.actions || []),
      userId: req.user.id,
    });

    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflows = async (req: AuthRequest, res: Response) => {
  try {
    const workflows = await Workflow.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    if (req.body.actions !== undefined) {
      const actionsError = validateWorkflowActions(req.body.actions);
      if (actionsError) {
        return res.status(400).json({ message: actionsError });
      }

      req.body.actions = normalizeWorkflowActions(req.body.actions);
    }

    const workflow = await Workflow.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      req.body,
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

export const deleteWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    res.json({ message: "Workflow deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflowExecutions = async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : null;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [executions, total] = await Promise.all([
        WorkflowExecution.find({ workflowId: workflow._id, userId: req.user.id })
          .sort({ executedAt: -1 })
          .skip(skip)
          .limit(limit),
        WorkflowExecution.countDocuments({ workflowId: workflow._id, userId: req.user.id })
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
      userId: req.user.id,
    }).sort({ executedAt: -1 });

    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const testWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user.id,
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
