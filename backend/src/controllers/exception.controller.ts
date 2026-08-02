import { Request, Response } from "express";
import Workspace from "../models/Workspace";
import ExceptionIssue from "../models/ExceptionIssue";
import ExceptionEvent from "../models/ExceptionEvent";
import { computeExceptionHash, parseUserAgent } from "../utils/exceptionUtils";
import { WorkspaceRequest } from "../middlewares/rbac";

/**
 * POST /api/errors/ingest
 * Public Ingestion Endpoint called by client JavaScript SDK
 */
export const ingestException = async (req: Request, res: Response) => {
  try {
    const { workspaceId, error, url, userAgent, user, extra } = req.body;

    // 1. Validation: Workspace ID is required
    const targetWorkspaceId = workspaceId || req.headers["x-workspace-id"];
    if (!targetWorkspaceId) {
      return res.status(400).json({ message: "Workspace ID is required for error ingestion" });
    }

    // 2. Validate workspace existence
    const workspace = await Workspace.findById(targetWorkspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Invalid Workspace ID" });
    }

    // 3. Extract error fields
    const errorType = error?.name || "Error";
    const message = error?.message || "Unknown client exception";
    const stack = error?.stack || "";
    const rawUserAgent = userAgent || req.headers["user-agent"] || "";
    const currentUrl = url || req.headers.referer || "Unknown URL";

    // 4. Compute Hash & Parse User Agent
    const hash = computeExceptionHash(errorType, message, stack);
    const { browser, os } = parseUserAgent(rawUserAgent);

    // Sanitize Keys for MongoDB Map updates (replace '.' with '_')
    const safeBrowserName = browser.name.replace(/\./g, "_");
    const safeOsName = os.name.replace(/\./g, "_");
    
    // Clean URL path (remove domain for group key)
    let urlPath = currentUrl;
    try {
      const parsedUrl = new URL(currentUrl);
      urlPath = parsedUrl.pathname;
    } catch (_) {
      urlPath = currentUrl;
    }
    const safeUrlKey = urlPath.replace(/\./g, "_").slice(0, 50); // limit length

    // 5. ATOMIC UPSERT: Find existing issue or create new one in 1 query!
    const issue = await ExceptionIssue.findOneAndUpdate(
      { workspaceId: targetWorkspaceId, hash },
      {
        $setOnInsert: {
          errorType,
          message,
          firstSeen: new Date(),
          status: "UNRESOLVED",
        },
        $set: {
          lastSeen: new Date(),
        },
        $inc: {
          count: 1,
          [`browsers.${safeBrowserName}`]: 1,
          [`os.${safeOsName}`]: 1,
          [`urls.${safeUrlKey}`]: 1,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    // 6. Save individual crash event log
    const event = await ExceptionEvent.create({
      issueId: issue._id,
      workspaceId: targetWorkspaceId,
      errorType,
      message,
      stack,
      url: currentUrl,
      userAgent: rawUserAgent,
      browser,
      os,
      user: user || {},
      extra: extra || {},
      timestamp: new Date(),
    });

    return res.status(201).json({
      success: true,
      issueId: issue._id,
      eventId: event._id,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/errors/sdk.js
 * Serves the self-hosted vanilla JavaScript SDK tracker script directly to client apps.
 */
export const serveSdk = (_req: Request, res: Response) => {
  const sdkScript = `
(function() {
  var _workspaceId = null;
  var _endpoint = null;

  var MiniSentry = {
    init: function(config) {
      _workspaceId = config.workspaceId;
      _endpoint = config.endpoint || (window.location.protocol + "//" + window.location.host);
      if (!_workspaceId) {
        console.error("MiniSentry: workspaceId is required");
      }
    },

    captureException: function(error, extra) {
      if (!_workspaceId) return;

      var payload = {
        workspaceId: _workspaceId,
        error: {
          name: error.name || "Error",
          message: error.message || String(error),
          stack: error.stack || ""
        },
        url: window.location.href,
        userAgent: navigator.userAgent,
        extra: extra || {},
        timestamp: new Date().toISOString()
      };

      var targetUrl = _endpoint + "/api/errors/ingest";

      // Non-blocking transmission via sendBeacon (ideal for page unloads/crashes)
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(targetUrl, blob);
      } else {
        fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(function(err) {
          console.error("MiniSentry send failed:", err);
        });
      }
    }
  };

  // Auto-initialize if workspaceId is in data attribute OR script URL query string
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  if (script && script.src) {
    try {
      var scriptUrl = new URL(script.src);
      var wsId = script.getAttribute("data-workspace-id") || scriptUrl.searchParams.get("workspaceId");
      var endpoint = script.getAttribute("data-endpoint") || scriptUrl.origin;
      if (wsId) {
        MiniSentry.init({
          workspaceId: wsId,
          endpoint: endpoint
        });
      }
    } catch (e) {
      console.error("MiniSentry init failed:", e);
    }
  }

  // Automatically catch unhandled runtime errors
  window.addEventListener("error", function(event) {
    if (event.error) {
      MiniSentry.captureException(event.error);
    } else {
      MiniSentry.captureException({
        name: "Error",
        message: event.message,
        stack: "at " + event.filename + ":" + event.lineno + ":" + event.colno
      });
    }
  });

  // Automatically catch unhandled Promise rejections
  window.addEventListener("unhandledrejection", function(event) {
    var reason = event.reason;
    if (reason instanceof Error) {
      MiniSentry.captureException(reason, { promiseRejection: true });
    } else {
      MiniSentry.captureException({
        name: "UnhandledRejection",
        message: typeof reason === "object" ? JSON.stringify(reason) : String(reason),
        stack: ""
      }, { promiseRejection: true });
    }
  });

  window.MiniSentry = MiniSentry;
})();
  `.trim();

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600"); // Cache in browser for 1 hour
  return res.send(sdkScript);
};

/**
 * GET /api/errors/issues
 * List grouped issues for a workspace with search, filtering & pagination
 */
export const getIssues = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspaceId = req.workspace._id;
    const { status, search, sortBy, page = 1, limit = 20 } = req.query;

    const query: any = { workspaceId };

    // Filter by status (UNRESOLVED, RESOLVED, IGNORED)
    if (status && ["UNRESOLVED", "RESOLVED", "IGNORED"].includes(status as string)) {
      query.status = status;
    }

    // Search by message or errorType (case-insensitive regex search)
    if (search) {
      query.$or = [
        { message: { $regex: search as string, $options: "i" } },
        { errorType: { $regex: search as string, $options: "i" } },
      ];
    }

    // Sorting order
    let sort: any = { lastSeen: -1 };
    if (sortBy === "count") sort = { count: -1 };
    if (sortBy === "firstSeen") sort = { firstSeen: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const issues = await ExceptionIssue.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await ExceptionIssue.countDocuments(query);

    return res.json({
      issues,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/errors/issues/:id
 * Get details of a single issue by ID
 */
export const getIssueById = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspace._id;

    const issue = await ExceptionIssue.findOne({ _id: id, workspaceId });
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    return res.json(issue);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/errors/issues/:id/events
 * Get individual crash event occurrences for a specific issue
 */
export const getIssueEvents = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspace._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const events = await ExceptionEvent.find({ issueId: id, workspaceId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ExceptionEvent.countDocuments({ issueId: id, workspaceId });

    return res.json({
      events,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/errors/issues/:id/status
 * Update status or assignee of an issue (RESOLVED, IGNORED, UNRESOLVED, assignedTo)
 */
export const updateIssueStatus = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const workspaceId = req.workspace._id;

    if (!["UNRESOLVED", "RESOLVED", "IGNORED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const issue = await ExceptionIssue.findOneAndUpdate(
      { _id: id, workspaceId },
      { status },
      { returnDocument: "after" }
    );

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    return res.json(issue);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/errors/issues/:id
 * Delete an issue and all its associated event logs
 */
export const deleteIssue = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspace._id;

    const issue = await ExceptionIssue.findOneAndDelete({ _id: id, workspaceId });
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Clean up all individual event logs
    await ExceptionEvent.deleteMany({ issueId: id, workspaceId });

    return res.json({ message: "Issue and associated event logs deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/errors/stats
 * Get 7-day timeline crash stats and browser/OS breakdowns for workspace
 */
export const getExceptionStats = async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspaceId = req.workspace._id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // MongoDB Aggregation Pipeline: Groups crash occurrences by Day
    const timeline = await ExceptionEvent.aggregate([
      {
        $match: {
          workspaceId: workspaceId,
          timestamp: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const unresolvedCount = await ExceptionIssue.countDocuments({
      workspaceId,
      status: "UNRESOLVED",
    });

    const totalCount = await ExceptionIssue.countDocuments({ workspaceId });

    return res.json({
      unresolvedCount,
      totalCount,
      timeline,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};


