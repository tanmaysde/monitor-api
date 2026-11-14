import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const isAiEnabled = () => process.env.AI_ANALYSIS_ENABLED === "true"; 

/** True when the Gemini API key and model name are both set. */
export const isLlmConfigured = () =>
  Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);

/** Returns the model name, e.g. "gemini-3.5-flash". */
export const getModelName = () => process.env.GEMINI_MODEL as string;


/**
 * Creates a LangChain chat model for Gemini.
 * Called once per agent run: cheap to create, no persistent connection.
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
    maxRetries: 3,    // LangChain retries failed calls (we customise this in Phase 8)
  });
};

