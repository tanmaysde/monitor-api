import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import logger from "../utils/logger";

// ────────────────────────────────────────────────────────────────
// Feature flags.
// AI is OFF unless the env var says otherwise. Nothing starts by accident.
// ────────────────────────────────────────────────────────────────

/** Master switch for the AI analysis feature. */
export const isAiEnabled = () => process.env.AI_ANALYSIS_ENABLED === "true";

/** True when the Gemini API key and model name are both set. */
export const isLlmConfigured = () =>
  Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);

/** Returns the model name string (e.g. "gemini-2.0-flash"). */
export const getModelName = () => process.env.GEMINI_MODEL as string;

// ────────────────────────────────────────────────────────────────
// Retry policy for Gemini calls.
//
// LangChain retries failed calls, but its default rules treat every Gemini
// "You exceeded your current quota" message as permanent. Gemini uses that same
// wording for the short per-minute limit too, so without this handler a single
// busy minute would fail the whole analysis.
//
// LangChain calls this after each failed attempt and waits for it:
//   - return normally  -> LangChain retries the call
//   - throw            -> LangChain stops retrying and the error reaches our code
// ────────────────────────────────────────────────────────────────

const MAX_WAIT_MS = 60_000;
const NO_RETRY_STATUS = [400, 401, 403, 404];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** HTTP status from the error object, or from text like "[429 Too Many Requests]". */
const statusOf = (error: any, message: string): number | undefined => {
  if (typeof error?.status === "number") return error.status;
  const match = /\[(\d{3})[^\]]*\]/.exec(message);
  return match ? Number(match[1]) : undefined;
};

export const geminiRetryHandler = async (error: any): Promise<void> => {
  const message = String(error?.message ?? "");

  // Cancelled on purpose: never retry.
  if (error?.name === "AbortError") throw error;

  const status = statusOf(error, message);

  // Bad request, bad key, no access, unknown model: retrying won't help.
  if (status !== undefined && NO_RETRY_STATUS.includes(status)) throw error;

  if (status === 429) {
    // The DAILY free-tier quota will not come back for hours: stop now and mark
    // the error so the worker can show the right message.
    if (/per day|PerDay/i.test(message)) {
      error.dailyQuota = true;
      throw error;
    }
    // Per-minute limit: Gemini says how long to wait ("Please retry in 39.4s").
    const hintSeconds = Number(/retry in ([\d.]+)s/i.exec(message)?.[1]);
    const waitMs = Number.isFinite(hintSeconds)
      ? Math.min(MAX_WAIT_MS, Math.ceil(hintSeconds * 1000) + 1000)
      : 15_000;
    logger.warn(`Gemini rate limit, waiting ${Math.round(waitMs / 1000)}s before retrying`);
    await sleep(waitMs);
    return; // retry
  }

  // 5xx (model overloaded) or network errors: let LangChain retry with backoff.
};

// ────────────────────────────────────────────────────────────────
// LLM factory: a LangChain ChatGoogleGenerativeAI model.
//
// We read env vars INSIDE the function (not at import time) because
// server.ts calls dotenv.config() after imports have already run.
// ────────────────────────────────────────────────────────────────

/**
 * Creates a ChatGoogleGenerativeAI instance that LangGraph nodes can use.
 * Called once per agent run — cheap to create, no persistent connection.
 */
export const createChatModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL;
  if (!apiKey || !modelName) {
    throw new Error("GEMINI_API_KEY and GEMINI_MODEL must be set");
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
    temperature: 0.2, // low = more factual, less creative
    maxRetries: 3, // up to 3 retries per call, decided by geminiRetryHandler
    onFailedAttempt: geminiRetryHandler,
  });
};
