import { ActionType } from "../types/action.types";
import { WorkflowAction } from "../types/workflow.types";

const ACTION_TYPES: readonly ActionType[] = ["EMAIL", "WEBHOOK", "SLACK", "TEAMS"];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isValidActionType = (type: unknown): type is ActionType => {
  return typeof type === "string" && (ACTION_TYPES as readonly string[]).includes(type);
};

// A destination must be a well-formed http(s) URL.
const isHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const HEADER_NAME = /^[A-Za-z0-9-]+$/;

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

const validateWebhookConfig = (config: Record<string, unknown>): string | null => {
  if (!isHttpUrl(config.url)) {
    return "WEBHOOK action requires a valid http(s) 'url'";
  }

  if (config.headers !== undefined) {
    if (!isObject(config.headers)) {
      return "WEBHOOK action 'headers' must be an object";
    }
    const entries = Object.entries(config.headers);
    if (entries.length > 20) {
      return "WEBHOOK action allows at most 20 headers";
    }
    for (const [name, value] of entries) {
      if (!HEADER_NAME.test(name)) {
        return `WEBHOOK header name '${name}' is invalid`;
      }
      if (typeof value !== "string" || /[\r\n]/.test(value)) {
        return `WEBHOOK header '${name}' must be a single-line string`;
      }
    }
  }

  return null;
};

const validateChatWebhookConfig = (
  type: "SLACK" | "TEAMS",
  config: Record<string, unknown>
): string | null => {
  if (!isHttpUrl(config.webhookUrl)) {
    return `${type} action requires a valid http(s) 'webhookUrl'`;
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

    let error: string | null = null;
    if (action.type === "EMAIL") {
      error = validateEmailConfig(config);
    } else if (action.type === "WEBHOOK") {
      error = validateWebhookConfig(config);
    } else {
      error = validateChatWebhookConfig(action.type, config);
    }

    if (error) {
      return `Action at index ${i}: ${error}`;
    }
  }

  return null;
};

// Keep only the config keys each action type understands (drops anything extra).
const CONFIG_KEYS: Record<ActionType, readonly string[]> = {
  EMAIL: ["to", "subject", "text", "html"],
  WEBHOOK: ["url", "headers"],
  SLACK: ["webhookUrl"],
  TEAMS: ["webhookUrl"],
};

export const normalizeWorkflowActions = (
  actions: WorkflowAction[]
): WorkflowAction[] => {
  return actions.map((action) => {
    const rawConfig =
      action.config && typeof action.config === "object" ? action.config : {};
    const config: Record<string, unknown> = {};
    for (const key of CONFIG_KEYS[action.type] ?? []) {
      if (rawConfig[key] !== undefined) config[key] = rawConfig[key];
    }
    return { type: action.type, config };
  });
};
