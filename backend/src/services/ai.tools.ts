import dns from "dns";
import mongoose from "mongoose";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Log from "../models/Log";
import Monitor from "../models/Monitor";
import ExceptionIssue from "../models/ExceptionIssue";

// ────────────────────────────────────────────────────────────────
// Tool Context
//
// Everything the tools need comes from the INCIDENT in our database,
// never from the AI model.  This keeps one tenant's data private.
// ────────────────────────────────────────────────────────────────

export interface ToolContext {
  workspaceId: mongoose.Types.ObjectId;
  monitorId: mongoose.Types.ObjectId;
  anchorTime: Date; // when the incident started
}

// ────────────────────────────────────────────────────────────────
// Small helpers (same as before)
// ────────────────────────────────────────────────────────────────

/** Keep a number inside [min, max]; fall back to `def` if the model sent junk. */
const clamp = (value: unknown, min: number, max: number, def: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Cut long strings. Error messages are untrusted text, so keep them short. */
const clip = (text: unknown, max = 300) => {
  const s = String(text ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
};

// ────────────────────────────────────────────────────────────────
// LangChain Tools
//
// Each tool is created by a factory function that takes a ToolContext.
// This way the workspaceId / monitorId are baked in at creation time —
// the model can NEVER change them.
// ────────────────────────────────────────────────────────────────

/**
 * Creates all 5 SRE tools scoped to a specific incident's context.
 * Call this once per agent run with the incident's IDs.
 */
export const createTools = (ctx: ToolContext) => {
  // ── 1. get_recent_logs ──────────────────────────────────────
  const getRecentLogs = tool(
    async ({ limit }) => {
      const safeLimit = clamp(limit, 1, 30, 15);
      const logs: any[] = await Log.find({
        monitorId: ctx.monitorId,
        workspaceId: ctx.workspaceId,
      })
        .sort({ checkedAt: -1 })
        .limit(safeLimit)
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

      return JSON.stringify({ checks: rows, downCount: down, averageResponseTimeMs: avg });
    },
    {
      name: "get_recent_logs",
      description:
        "Get the most recent health-check results (status, response time, status code, error message) for the monitor. Newest first.",
      schema: z.object({
        limit: z
          .number()
          .optional()
          .describe("How many recent checks to return (1-30). Default 15."),
      }),
    }
  );

  // ── 2. get_ssl_info ─────────────────────────────────────────
  const getSslInfo = tool(
    async () => {
      const monitor: any = await Monitor.findOne({
        _id: ctx.monitorId,
        workspaceId: ctx.workspaceId,
      })
        .select("url sslInfo")
        .lean();
      if (!monitor) return JSON.stringify({ error: "Monitor not found" });

      const ssl = monitor.sslInfo || {};
      return JSON.stringify({
        url: monitor.url,
        isHttps: ssl.isHttps ?? false,
        isValid: ssl.isValid ?? null,
        isExpired: ssl.isExpired ?? null,
        daysRemaining: ssl.daysRemaining ?? null,
        validTo: ssl.validTo ?? null,
        issuer: ssl.issuer ?? null,
        error: ssl.error ? clip(ssl.error) : null,
      });
    },
    {
      name: "get_ssl_info",
      description:
        "Get the SSL/TLS certificate status of the monitor (expiry date, days remaining, validity, errors).",
      schema: z.object({}),
    }
  );

  // ── 3. get_related_exceptions ───────────────────────────────
  const getRelatedExceptions = tool(
    async ({ windowMinutes }) => {
      const windowMin = clamp(windowMinutes, 5, 1440, 60);
      const from = new Date(ctx.anchorTime.getTime() - windowMin * 60_000);
      const to = new Date(ctx.anchorTime.getTime() + windowMin * 60_000);

      const issues: any[] = await ExceptionIssue.find({
        workspaceId: ctx.workspaceId,
        lastSeen: { $gte: from },
        firstSeen: { $lte: to },
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
      return JSON.stringify({ windowMinutes: windowMin, exceptions: rows });
    },
    {
      name: "get_related_exceptions",
      description:
        "Get application exception groups (from error tracking) that occurred around the time the incident started.",
      schema: z.object({
        windowMinutes: z
          .number()
          .optional()
          .describe(
            "How many minutes before and after the incident start to search (5-1440). Default 60."
          ),
      }),
    }
  );

  // ── 4. get_other_monitor_statuses ───────────────────────────
  const getOtherMonitorStatuses = tool(
    async () => {
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
      return JSON.stringify({ monitors: rows, downCount, total: rows.length });
    },
    {
      name: "get_other_monitor_statuses",
      description:
        "Get the current status of all other monitors in the same workspace, to tell whether only this service is failing or many are.",
      schema: z.object({}),
    }
  );

  // ── 5. dns_lookup ───────────────────────────────────────────
  const dnsLookup = tool(
    async () => {
      const monitor: any = await Monitor.findOne({
        _id: ctx.monitorId,
        workspaceId: ctx.workspaceId,
      })
        .select("url")
        .lean();
      if (!monitor) return JSON.stringify({ error: "Monitor not found" });

      let hostname = monitor.url;
      try {
        hostname = new URL(monitor.url).hostname;
      } catch {
        /* url had no scheme — use it as-is */
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
        return JSON.stringify({ hostname, resolved: true, addresses });
      } catch (err: any) {
        return JSON.stringify({
          hostname,
          resolved: false,
          errorCode: err.code || "UNKNOWN",
          error: clip(err.message),
        });
      }
    },
    {
      name: "dns_lookup",
      description:
        "Resolve the hostname of this incident's monitor to IP addresses, to check whether DNS is working.",
      schema: z.object({}),
    }
  );

  // Return all tools as an array — LangGraph's ToolNode accepts this directly.
  return [getRecentLogs, getSslInfo, getRelatedExceptions, getOtherMonitorStatuses, dnsLookup];
};
