import nodemailer from "nodemailer";
import {
  ActionContext,
  ActionType,
  EmailActionConfig,
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

  throw new Error(`Unsupported action type: ${type}`);
};
