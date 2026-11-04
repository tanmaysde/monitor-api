import nodemailer from "nodemailer";
import axios from "axios";
import { allowPrivateTargets, assertSafeOutboundUrl, guardedLookup } from "../utils/outboundGuard";
import {
  ActionContext,
  ActionType,
  EmailActionConfig,
  WebhookActionConfig,
  SlackActionConfig,
  TeamsActionConfig,
} from "../types/action.types";

/**
 * Sends a JSON POST to a user-supplied URL, safely:
 * - blocks private/internal targets (SSRF) unless ALLOW_PRIVATE_WEBHOOK_TARGETS=true
 * - does not follow redirects (a redirect could point at an internal address)
 * - 10 second timeout so a slow endpoint can't hang the workflow
 */
const postJson = async (
  url: string,
  payload: unknown,
  headers: Record<string, string> = {}
) => {
  const allowPrivate = allowPrivateTargets();
  if (!allowPrivate) assertSafeOutboundUrl(url);

  await axios.post(url, payload, {
    headers: { "Content-Type": "application/json", ...headers },
    timeout: 10000,
    maxRedirects: 0,
    ...(allowPrivate ? {} : { lookup: guardedLookup }),
  });
};

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

const isSlackActionConfig = (config: unknown): config is SlackActionConfig => {
  return isObject(config) && typeof config.webhookUrl === "string" && config.webhookUrl.trim().length > 0;
};

const isTeamsActionConfig = (config: unknown): config is TeamsActionConfig => {
  return isObject(config) && typeof config.webhookUrl === "string" && config.webhookUrl.trim().length > 0;
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
  // (custom headers, e.g. bearer tokens for auth, are passed through if provided)
  await postJson(config.url, payload, config.headers || {});
};

/**
 * Executes a Slack Alert Action (POST blocks attachment payload to Slack webhook)
 */
export const executeSlackAction = async (
  config: SlackActionConfig,
  context: ActionContext
) => {
  const isUp = context.trigger === "API_UP";
  const emoji = isUp ? "🟢" : "🔴";
  const color = isUp ? "#2ecc71" : "#e74c3c";

  const slackPayload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${emoji} API Monitor Alert: ${context.monitorName || "Unknown Monitor"}*`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Event:* \`${context.trigger}\``,
              },
              {
                type: "mrkdwn",
                text: `*Workflow:* ${context.workflowName || "Unknown"}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Details:* ${context.eventMessage || "No message provided."}`,
            },
          },
        ],
      },
    ],
  };

  await postJson(config.webhookUrl, slackPayload);
};

/**
 * Executes a Microsoft Teams Alert Action (POST MessageCard format to Teams webhook)
 */
export const executeTeamsAction = async (
  config: TeamsActionConfig,
  context: ActionContext
) => {
  const isUp = context.trigger === "API_UP";
  const themeColor = isUp ? "2ECC71" : "E74C3C";
  const statusEmoji = isUp ? "🟢" : "🔴";

  const teamsPayload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": themeColor,
    "summary": `API Monitor Alert: ${context.monitorName}`,
    "sections": [
      {
        "activityTitle": `### ${statusEmoji} API Monitor Alert`,
        "activitySubtitle": `Triggered by workflow: **${context.workflowName || "Unknown"}**`,
        "facts": [
          {
            "name": "Monitor Target",
            "value": context.monitorName || "Unknown Monitor"
          },
          {
            "name": "Trigger Event",
            "value": `\`${context.trigger}\``
          },
          {
            "name": "Status Log",
            "value": context.eventMessage || "No description details."
          }
        ],
        "markdown": true
      }
    ]
  };

  await postJson(config.webhookUrl, teamsPayload);
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

  if (type === "SLACK") {
    if (!isSlackActionConfig(config)) {
      throw new Error("Invalid SLACK action config");
    }
    await executeSlackAction(config, context);
    return;
  }

  if (type === "TEAMS") {
    if (!isTeamsActionConfig(config)) {
      throw new Error("Invalid TEAMS action config");
    }
    await executeTeamsAction(config, context);
    return;
  }

  throw new Error(`Unsupported action type: ${type}`);
};
