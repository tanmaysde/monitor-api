import dns from "dns";
import mongoose from "mongoose";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import Log from "../models/Log";
import Monitor from "../models/Monitor";
import ExceptionIssue from "../models/ExceptionIssue";

/**
 * Everything the tools need to know comes from the INCIDENT in our database,
 * never from the AI model. This is what keeps one tenant's data private.
 */
export interface ToolContext {
  workspaceId: mongoose.Types.ObjectId;
  monitorId: mongoose.Types.ObjectId;
  anchorTime: Date; // when the incident started
}

export interface ToolResult {
  summary: string; // short text we store on the incident
  data: unknown; // full data we send back to the model
}

// ---------- small helpers ----------

// Keep a number inside [min, max]; fall back to `def` if the model sent junk.
const clamp = (value: unknown, min: number, max: number, def: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
};

// Cut long strings. Error messages are untrusted text, so keep them short.
const clip = (text: unknown, max = 300) => {
  const s = String(text ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
};

// ---------- the menu the model sees (names + descriptions only) ----------

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_recent_logs",
    description:
      "Get the most recent health-check results (status, response time, status code, error message) for the monitor in this incident. Newest first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "How many recent checks to return (1-30). Default 15.",
        },
      },
    },
  },
  {
    name: "get_ssl_info",
    description:
      "Get the SSL/TLS certificate status of the monitor (expiry date, days remaining, validity, errors).",
  },
  {
    name: "get_related_exceptions",
    description:
      "Get application exception groups (from error tracking) that occurred around the time the incident started.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        windowMinutes: {
          type: SchemaType.NUMBER,
          description:
            "How many minutes before and after the incident start to search (5-1440). Default 60.",
        },
      },
    },
  },
  {
    name: "get_other_monitor_statuses",
    description:
      "Get the current status of all other monitors in the same workspace, to tell whether only this service is failing or many are.",
  },
  {
    name: "dns_lookup",
    description:
      "Resolve the hostname of this incident's monitor to IP addresses, to check whether DNS is working.",
  },
];

// ---------- the actual functions (our code, not the model's) ----------

const getRecentLogs = async (ctx: ToolContext, args: any): Promise<ToolResult> => {
  const limit = clamp(args?.limit, 1, 30, 15);
  const logs: any[] = await Log.find({
    monitorId: ctx.monitorId,
    workspaceId: ctx.workspaceId, // always from the incident
  })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .lean();

  const rows = logs.map((l) => ({
    at: l.checkedAt,
    status: l.status,
    responseTimeMs: l.responseTime,
    statusCode: l.statusCode ?? null,
    error: l.errorMessage ? clip(l.errorMessage) : null,
  }));
  const down = rows.filter((r) => r.status === "DOWN").length;
  const avg = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.responseTimeMs, 0) / rows.length)
    : 0;

  return {
    summary: `Last ${rows.length} checks: ${down} DOWN, avg ${avg}ms`,
    data: { checks: rows, downCount: down, averageResponseTimeMs: avg },
  };
};

const getSslInfo = async (ctx: ToolContext): Promise<ToolResult> => {
  const monitor: any = await Monitor.findOne({
    _id: ctx.monitorId,
    workspaceId: ctx.workspaceId,
  })
    .select("url sslInfo")
    .lean();
  if (!monitor) return { summary: "Monitor not found", data: { error: "Monitor not found" } };

  const ssl = monitor.sslInfo || {};
  return {
    summary: ssl.isHttps
      ? `HTTPS, expired=${ssl.isExpired ?? "unknown"}, days remaining=${ssl.daysRemaining ?? "unknown"}`
      : "Not an HTTPS monitor",
    data: {
      url: monitor.url,
      isHttps: ssl.isHttps ?? false,
      isValid: ssl.isValid ?? null,
      isExpired: ssl.isExpired ?? null,
      daysRemaining: ssl.daysRemaining ?? null,
      validTo: ssl.validTo ?? null,
      issuer: ssl.issuer ?? null,
      error: ssl.error ? clip(ssl.error) : null,
    },
  };
};

const getRelatedExceptions = async (ctx: ToolContext, args: any): Promise<ToolResult> => {
  const windowMin = clamp(args?.windowMinutes, 5, 1440, 60);
  const from = new Date(ctx.anchorTime.getTime() - windowMin * 60_000);
  const to = new Date(ctx.anchorTime.getTime() + windowMin * 60_000);

  const issues: any[] = await ExceptionIssue.find({
    workspaceId: ctx.workspaceId,
    lastSeen: { $gte: from }, // still happening after window start
    firstSeen: { $lte: to }, // started before window end
  })
    .sort({ lastSeen: -1 })
    .limit(5)
    .lean();

  const rows = issues.map((i) => ({
    errorType: i.errorType,
    message: clip(i.message),
    occurrences: i.count,
    firstSeen: i.firstSeen,
    lastSeen: i.lastSeen,
  }));

  return {
    summary: `${rows.length} exception group(s) within ±${windowMin}min`,
    data: { windowMinutes: windowMin, exceptions: rows },
  };
};

const getOtherMonitorStatuses = async (ctx: ToolContext): Promise<ToolResult> => {
  const monitors: any[] = await Monitor.find({ workspaceId: ctx.workspaceId })
    .select("name status lastCheckedAt lastResponseTime")
    .limit(50)
    .lean();

  const rows = monitors.map((m) => ({
    name: clip(m.name, 80),
    status: m.status,
    lastResponseTimeMs: m.lastResponseTime,
    isThisIncidentsMonitor: String(m._id) === String(ctx.monitorId),
  }));
  const downCount = rows.filter((r) => r.status === "DOWN").length;

  return {
    summary: `${downCount} of ${rows.length} monitors are DOWN`,
    data: { monitors: rows, downCount, total: rows.length },
  };
};

const dnsLookup = async (ctx: ToolContext): Promise<ToolResult> => {
  const monitor: any = await Monitor.findOne({
    _id: ctx.monitorId,
    workspaceId: ctx.workspaceId,
  })
    .select("url")
    .lean();
  if (!monitor) return { summary: "Monitor not found", data: { error: "Monitor not found" } };

  // The hostname comes from the monitor, NOT from the model.
  let hostname = monitor.url;
  try {
    hostname = new URL(monitor.url).hostname;
  } catch {
    /* url had no scheme: use it as-is */
  }

  try {
    const result = await Promise.race([
      dns.promises.lookup(hostname, { all: true }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(Object.assign(new Error("DNS lookup timed out"), { code: "TIMEOUT" })),
          4000
        )
      ),
    ]);
    const addresses = result.map((r) => r.address);
    return {
      summary: `${hostname} resolved to ${addresses.join(", ")}`,
      data: { hostname, resolved: true, addresses },
    };
  } catch (err: any) {
    return {
      summary: `${hostname} failed to resolve (${err.code || "error"})`,
      data: { hostname, resolved: false, errorCode: err.code || "UNKNOWN", error: clip(err.message) },
    };
  }
};

// ---------- the dispatcher: the ONLY way the model's request reaches our code ----------

export const executeTool = async (
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolResult> => {
  try {
    switch (name) {
      case "get_recent_logs":
        return await getRecentLogs(ctx, args);
      case "get_ssl_info":
        return await getSslInfo(ctx);
      case "get_related_exceptions":
        return await getRelatedExceptions(ctx, args);
      case "get_other_monitor_statuses":
        return await getOtherMonitorStatuses(ctx);
      case "dns_lookup":
        return await dnsLookup(ctx);
      default:
        return { summary: `Unknown tool: ${name}`, data: { error: `Unknown tool: ${name}` } };
    }
  } catch (err: any) {
    // A failing tool must not crash the agent: tell the model what happened.
    return { summary: `Tool ${name} failed`, data: { error: clip(err.message) } };
  }
};
