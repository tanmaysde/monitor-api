import { Queue } from "bullmq";
import Redis from "ioredis";
import mongoose from "mongoose";
import Incident from "../models/Incident";
import { isAiEnabled, isLlmConfigured } from "../services/llm.service";
import logger from "../utils/logger";

export const ANALYSIS_QUEUE = "incident-analysis";

const COOLDOWN_MS = 30_000; // minimum gap between manual re-runs
const STALE_PENDING_MS = 5 * 60_000; // a PENDING analysis older than this is considered stuck

export const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableOfflineQueue: false,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined, // Upstash
    connectTimeout: 10000,
  });
};

// Created lazily so importing this file never opens a Redis connection by itself.
let queue: Queue | null = null;
const getQueue = () => {
  if (!queue) queue = new Queue(ANALYSIS_QUEUE, { connection: createRedisConnection() });
  return queue;
};

export type AnalysisRequestCode =
  | "QUEUED"
  | "NOT_FOUND"
  | "DISABLED"
  | "NOT_CONFIGURED"
  | "ALREADY_PENDING"
  | "ALREADY_EXISTS"
  | "COOLDOWN"
  | "DAILY_LIMIT"
  | "ENQUEUE_FAILED";

export interface AnalysisRequestResult {
  code: AnalysisRequestCode;
  message: string;
}

/**
 * Asks for an AI analysis of an incident. It never throws: the incident flow
 * must keep working even if AI, Redis or the model is unavailable.
 *
 *  - automatic call (incident opened):   force = false  -> skip if already analysed
 *  - manual "Analyze" button:            force = true   -> re-run, but with a cooldown
 */
export const requestAnalysis = async (
  incidentId: string,
  options: { force?: boolean; workspaceId?: mongoose.Types.ObjectId } = {}
): Promise<AnalysisRequestResult> => {
  try {
    if (!isAiEnabled()) {
      return { code: "DISABLED", message: "AI analysis is turned off" };
    }
    if (!isLlmConfigured()) {
      return { code: "NOT_CONFIGURED", message: "AI analysis is not configured on this server" };
    }
    if (!mongoose.isValidObjectId(incidentId)) {
      return { code: "NOT_FOUND", message: "Incident not found" };
    }

    const incident = await Incident.findOne({
      _id: incidentId,
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    }).select("workspaceId analysis");
    if (!incident) return { code: "NOT_FOUND", message: "Incident not found" };

    const existing = incident.analysis;
    const now = Date.now();
    const requestedAt = existing?.requestedAt ? new Date(existing.requestedAt).getTime() : 0;

    if (existing?.status === "PENDING" && now - requestedAt < STALE_PENDING_MS) {
      return { code: "ALREADY_PENDING", message: "An analysis is already running for this incident" };
    }
    if (existing && !options.force) {
      return { code: "ALREADY_EXISTS", message: "This incident was already analysed" };
    }
    if (existing && now - requestedAt < COOLDOWN_MS) {
      return { code: "COOLDOWN", message: "Please wait a few seconds before re-running the analysis" };
    }

    // Cost control: cap analyses per workspace per day.
    const dailyLimit = Number(process.env.AI_DAILY_LIMIT || 30);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const usedToday = await Incident.countDocuments({
      workspaceId: incident.workspaceId,
      "analysis.requestedAt": { $gte: startOfDay },
    });
    if (usedToday >= dailyLimit) {
      return { code: "DAILY_LIMIT", message: `Daily AI analysis limit (${dailyLimit}) reached for this workspace` };
    }

    // Atomically claim the incident so two requests can't queue it twice.
    const claimed = await Incident.findOneAndUpdate(
      {
        _id: incident._id,
        $or: [
          { "analysis.status": { $ne: "PENDING" } },
          { "analysis.requestedAt": { $lt: new Date(now - STALE_PENDING_MS) } },
        ],
      },
      { $set: { analysis: { status: "PENDING", requestedAt: new Date() } } }
    );
    if (!claimed) {
      return { code: "ALREADY_PENDING", message: "An analysis is already running for this incident" };
    }

    try {
      await getQueue().add(
        "analyze-incident",
        { incidentId: String(incident._id) },
        { attempts: 1, removeOnComplete: true, removeOnFail: true }
      );
    } catch (err: any) {
      logger.error(`Could not queue AI analysis for incident ${incidentId}: ${err.message}`);
      await Incident.updateOne(
        { _id: incident._id },
        {
          $set: {
            analysis: {
              status: "FAILED",
              error: "Could not queue the analysis (is Redis running?)",
              requestedAt: new Date(),
              completedAt: new Date(),
            },
          },
        }
      );
      return { code: "ENQUEUE_FAILED", message: "Could not queue the analysis" };
    }

    return { code: "QUEUED", message: "Analysis started" };
  } catch (err: any) {
    logger.error(`requestAnalysis failed for incident ${incidentId}: ${err.message}`);
    return { code: "ENQUEUE_FAILED", message: "Could not start the analysis" };
  }
};
