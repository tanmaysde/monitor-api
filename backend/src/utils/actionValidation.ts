import { ActionType } from "../types/action.types";
import { WorkflowAction } from "../types/workflow.types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isValidActionType = (type: unknown): type is ActionType => {
  return type === "EMAIL";
};

const validateEmailConfig = (config: Record<string, unknown>): string | null => {
  if (typeof config.to !== "string" || !config.to.trim()) {
    return "EMAIL action requires a non-empty 'to' field";
  }

  if (typeof config.subject !== "string" || !config.subject.trim()) {
    return "EMAIL action requires a non-empty 'subject' field";
  }

  if (
    config.text !== undefined &&
    typeof config.text !== "string"
  ) {
    return "EMAIL action 'text' must be a string";
  }

  if (
    config.html !== undefined &&
    typeof config.html !== "string"
  ) {
    return "EMAIL action 'html' must be a string";
  }

  return null;
};

export const validateWorkflowActions = (actions: unknown): string | null => {
  if (!Array.isArray(actions)) {
    return "'actions' must be an array";
  }

  for (let i = 0; i < actions.length; i += 1) {
    const action = actions[i];

    if (!isObject(action)) {
      return `Action at index ${i} must be an object`;
    }

    if (!isValidActionType(action.type)) {
      return `Action at index ${i} has invalid type`;
    }

    const config = isObject(action.config) ? action.config : {};

    if (action.type === "EMAIL") {
      const error = validateEmailConfig(config);
      if (error) {
        return `Action at index ${i}: ${error}`;
      }
    }
  }

  return null;
};

export const normalizeWorkflowActions = (
  actions: WorkflowAction[]
): WorkflowAction[] => {
  return actions.map((action) => ({
    type: action.type,
    config:
      action.config && typeof action.config === "object" ? action.config : {},
  }));
};
