import { Types } from "mongoose";
import Workflow from "../models/Workflow";
import WorkflowExecution, {
  IWorkflowExecutionDocument,
} from "../models/WorkflowExecution";
import { EventType } from "../types/event.types";
import { WorkflowAction } from "../types/workflow.types";
import { executeActionByType } from "./action.service";

type WorkflowEventInput = {
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  workspaceId: Types.ObjectId
  type: EventType;
  monitorName?: string;
  eventMessage?: string;
};

type ExecuteWorkflowInput = {
  workflow: {
    _id: Types.ObjectId;
    name: string;
    actions: WorkflowAction[];
  };
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  workspaceId: Types.ObjectId
  trigger: EventType;
  monitorName?: string;
  eventMessage?: string;
};

const isSupportedActionType = (type: unknown) => {
  return type === "EMAIL";
};

const getValidWorkflowActions = (actions: WorkflowAction[]) => {
  return actions.filter((action) => isSupportedActionType(action.type));
};

const getInvalidWorkflowActionTypes = (actions: WorkflowAction[]) => {
  return actions
    .filter((action) => !isSupportedActionType(action.type))
    .map((action) => action.type);
};

const executeWorkflow = async ({
  workflow,
  eventId,
  monitorId,
  workspaceId,
  trigger,
  monitorName,
  eventMessage,
}: ExecuteWorkflowInput) => {
  const validActions = getValidWorkflowActions(workflow.actions);
  const invalidActionTypes = getInvalidWorkflowActionTypes(workflow.actions);

  try {
    if (invalidActionTypes.length > 0) {
      throw new Error(
        `Unsupported action type(s): ${invalidActionTypes.join(", ")}`
      );
    }

    for (const action of validActions) {
      await executeActionByType(action.type, action.config || {}, {
        workflowId: workflow._id,
        eventId,
        monitorId,
        workspaceId,
        trigger,
        workflowName: workflow.name,
        monitorName,
        eventMessage,
      });
    }

    return WorkflowExecution.create({
      workflowId: workflow._id,
      eventId,
      monitorId,
      workspaceId,
      trigger,
      status: "SUCCESS",
      actions: validActions,
      message: `Workflow "${workflow.name}" executed successfully`,
      executedAt: new Date(),
    });
  } catch (error: any) {
    return WorkflowExecution.create({
      workflowId: workflow._id,
      eventId,
      monitorId,
      workspaceId,
      trigger,
      status: "FAILED",
      actions: validActions,
      message: `Workflow "${workflow.name}" failed: ${error.message}`,
      executedAt: new Date(),
    });
  }
};

export const runWorkflowsForEvent = async (event: WorkflowEventInput) => {
  const workflows = await Workflow.find({
    workspaceId: event.workspaceId,
    trigger: event.type,
    enabled: true,
  });

  const executions: IWorkflowExecutionDocument[] = [];

  for (const workflow of workflows) {
    const execution = await executeWorkflow({
      workflow: {
        _id: workflow._id as Types.ObjectId,
        name: workflow.name,
        actions: workflow.actions,
      },
      eventId: event.eventId,
      monitorId: event.monitorId,
      workspaceId: event.workspaceId,
      trigger: event.type,
      monitorName: event.monitorName,
      eventMessage: event.eventMessage,
    });

    executions.push(execution);
  }

  return executions;
};

export const runWorkflowTest = async (workflowId: Types.ObjectId) => {
  const workflow = await Workflow.findById(workflowId);

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return executeWorkflow({
    workflow: {
      _id: workflow._id as Types.ObjectId,
      name: workflow.name,
      actions: workflow.actions,
    },
    eventId: new Types.ObjectId(),
    monitorId: new Types.ObjectId(),
    workspaceId: workflow.workspaceId,
    trigger: workflow.trigger,
    monitorName: "Manual Test Monitor",
    eventMessage: `Manual test run for workflow "${workflow.name}"`,
  });
};
