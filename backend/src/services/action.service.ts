import nodemailer from "nodemailer";
import axios from "axios";
import {
  ActionContext,
  ActionType,
  EmailActionConfig,
  WebhookActionConfig,
} from "../types/action.types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isEmailActionConfig = (config: unknown): config is EmailActionConfig => {
  return (
    isObject(config) &&
    typeof config.to === "string" &&
    config.to.trim().length > 0 &&
    typeof config.subject === "string" &&
    config.subject.trim().length > 0 &&
    (config.text === undefined || typeof config.text === "string") &&
    (config.html === undefined || typeof config.html === "string")
  );
};

const isWebhookActionConfig = (config: unknown): config is WebhookActionConfig => {
  return (
    isObject(config) &&
    typeof config.url === "string" &&
    config.url.trim().length > 0 &&
    (config.headers === undefined || isObject(config.headers))
  );
};

export const executeEmailAction = async (
  config: EmailActionConfig,
  context: ActionContext
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const text =
    config.text ||
    `Workflow: ${context.workflowName || "Unknown workflow"}
    Monitor: ${context.monitorName || "Unknown monitor"}
    Trigger: ${context.trigger}
    Message: ${context.eventMessage || "No message"}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: config.to,
    subject: config.subject,
    text,
    html: config.html,
  });
};


// * Executes a Webhook Action (POST request to custom URL)
//  */
export const executeWebhookAction = async (
  config: WebhookActionConfig,
  context: ActionContext
) => {
  // Construct the payload of data to send to the user's endpoint
  const payload = {
    event: context.trigger, // e.g. "API_DOWN" or "SLOW_RESPONSE"
    monitorId: context.monitorId.toString(),
    monitorName: context.monitorName || "Unknown monitor",
    message: context.eventMessage || "No message",
    workflowName: context.workflowName || "Unknown workflow",
    triggeredAt: new Date().toISOString(),
  };
  // Perform the HTTP POST request to the custom URL
  await axios.post(config.url, payload, {
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}), // Pass custom headers (e.g. bearer tokens for auth) if provided
    },
    timeout: 10000, // 10 seconds timeout limit so it doesn't hang
  });
};


export const executeActionByType = async (
  type: ActionType,
  config: Record<string, unknown>,
  context: ActionContext
) => {
  if (type === "EMAIL") {
    if (!isEmailActionConfig(config)) {
      throw new Error("Invalid EMAIL action config");
    }

    await executeEmailAction(config, context);
    return;
  }

   if (type === "WEBHOOK") {
    if (!isWebhookActionConfig(config)) {
      throw new Error("Invalid WEBHOOK action config");
    }
    await executeWebhookAction(config, context);
    return;
  }

  throw new Error(`Unsupported action type: ${type}`);
};
