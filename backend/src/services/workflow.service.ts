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
  userId: Types.ObjectId;
  type: EventType;
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

export const runWorkflowsForEvent = async (event: WorkflowEventInput) => {
  const workflows = await Workflow.find({
    userId: event.userId,
    trigger: event.type,
    enabled: true,
  });

  const executions: IWorkflowExecutionDocument[] = [];

  for (const workflow of workflows) {
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
          workflowId: workflow._id as Types.ObjectId,
          eventId: event.eventId,
          monitorId: event.monitorId,
          userId: event.userId,
          trigger: event.type,
          workflowName: workflow.name,
          monitorName: event.monitorName,
          eventMessage: event.eventMessage,
        });
      }

      const execution = await WorkflowExecution.create({
        workflowId: workflow._id,
        eventId: event.eventId,
        monitorId: event.monitorId,
        userId: event.userId,
        trigger: event.type,
        status: "SUCCESS",
        actions: validActions,
        message: `Workflow "${workflow.name}" executed successfully`,
        executedAt: new Date(),
      });

      executions.push(execution);
    } catch (error: any) {
      const execution = await WorkflowExecution.create({
        workflowId: workflow._id,
        eventId: event.eventId,
        monitorId: event.monitorId,
        userId: event.userId,
        trigger: event.type,
        status: "FAILED",
        actions: validActions,
        message: `Workflow "${workflow.name}" failed: ${error.message}`,
        executedAt: new Date(),
      });

      executions.push(execution);
    }
  }

  return executions;
};
