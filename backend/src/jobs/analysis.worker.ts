import { Worker, Job } from "bullmq";
import Incident from "../models/Incident";
import { runIncidentAgent } from "../services/incident.agent";
import { getModelName, isAiEnabled, isLlmConfigured } from "../services/llm.service";
import { ANALYSIS_QUEUE, createRedisConnection } from "./analysis.queue";
import logger from "../utils/logger";

// Turn raw errors into short, safe messages for the UI.
const friendlyError = (err: any): string => {
  if (err?.dailyQuota) return "The AI provider's daily quota is used up. Try again later or switch the model/plan.";
  if (err?.status === 429) return "AI rate limit reached. Please try again in a minute.";
  if (err?.status === 503) return "The AI model is overloaded right now. Please try again shortly.";
  const msg = String(err?.message || "Unknown error");
  return `Analysis failed: ${msg.length > 200 ? msg.slice(0, 200) + "…" : msg}`;
};

export const startAnalysisWorker = () => {
  if (!isAiEnabled()) {
    logger.info("AI analysis is turned off (AI_ANALYSIS_ENABLED is not 'true'): worker not started");
    return;
  }
  if (!isLlmConfigured()) {
    logger.warn("AI analysis worker not started: GEMINI_API_KEY / GEMINI_MODEL not set");
    return;
  }

  const worker = new Worker(
    ANALYSIS_QUEUE,
    async (job: Job) => {
      const { incidentId } = job.data;
      const incident = await Incident.findById(incidentId);
      if (!incident) return;

      const requestedAt = incident.analysis?.requestedAt ?? new Date();
      logger.info(`AI analysis started for incident ${incidentId}`);

      try {
        const result = await runIncidentAgent(incident);
        // $set only the analysis field so we never overwrite edits made meanwhile
        // (acknowledge, comments, ...) while the model was thinking.
        await Incident.updateOne(
          { _id: incident._id },
          {
            $set: {
              analysis: {
                status: "DONE",
                probableCause: result.probableCause,
                confidence: result.confidence,
                evidence: result.evidence,
                nextSteps: result.nextSteps,
                toolCalls: result.toolCalls,
                model: getModelName(),
                requestedAt,
                completedAt: new Date(),
              },
            },
          }
        );
        logger.info(`AI analysis finished for incident ${incidentId} (${result.confidence})`);
      } catch (err: any) {
        logger.error(`AI analysis failed for incident ${incidentId}: ${err.message}`);
        await Incident.updateOne(
          { _id: incident._id },
          {
            $set: {
              analysis: {
                status: "FAILED",
                error: friendlyError(err),
                model: getModelName(),
                requestedAt,
                completedAt: new Date(),
              },
            },
          }
        );
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // one at a time keeps us inside provider rate limits
    }
  );

  worker.on("ready", () => logger.info("AI analysis worker started"));
  worker.on("failed", (job, err) => logger.error(`Analysis job ${job?.id} failed: ${err.message}`));
};
