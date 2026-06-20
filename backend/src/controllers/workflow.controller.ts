import { Response } from "express";
import Workflow from "../models/Workflow";
import WorkflowExecution from "../models/WorkflowExecution";
import { AuthRequest } from "../middlewares/auth";

export const createWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await Workflow.create({
      ...req.body,
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
    const workflow = await Workflow.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      req.body,
      {
        new: true,
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

export const getWorkflowExecutions = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
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