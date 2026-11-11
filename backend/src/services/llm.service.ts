import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ────────────────────────────────────────────────────────────────
// Feature flags — these stay the same as before.
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
// LLM factory — creates a LangChain ChatGoogleGenerativeAI model.
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
    temperature: 0.2,       // low = more factual, less creative
    maxRetries: 3,           // LangChain handles 429 / 5xx retries for us
  });
};
