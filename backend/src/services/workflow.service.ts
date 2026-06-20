import { Types } from "mongoose";
import { EventType } from "../types/event.types";
import Workflow from "../models/Workflow";
import WorkflowExecution from "../models/WorkflowExecution";
import { IWorkflowExecutionDocument } from "../models/WorkflowExecution";


type WorkflowEventInput = {
  eventId: Types.ObjectId;
  monitorId: Types.ObjectId;
  userId: Types.ObjectId;
  type: EventType;
};

export const runWorkflowsForEvent = async (event: WorkflowEventInput) => {
  const workflows = await Workflow.find({
    userId: event.userId,
    trigger: event.type,
    enabled: true,
  });

  const executions: IWorkflowExecutionDocument[] = [];

  for (const workflow of workflows) {
    const execution = await WorkflowExecution.create({
      workflowId: workflow._id,
      eventId: event.eventId,
      monitorId: event.monitorId,
      userId: event.userId,
      trigger: event.type,
      status: "SUCCESS",
      actions: workflow.actions,
      message: `Workflow "${workflow.name}" matched ${event.type}`,
      executedAt: new Date(),
    });

    executions.push(execution);
  }

  return executions;
};