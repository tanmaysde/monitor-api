import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  ChatSession,
  GenerativeModel,
} from "@google/generative-ai";

/**
 * Master switch for the whole AI analysis feature. It is OFF unless
 * AI_ANALYSIS_ENABLED=true, so nothing is shown or runs by accident.
 */
export const isAiEnabled = () => process.env.AI_ANALYSIS_ENABLED === "true";

export const isLlmConfigured = () =>
  Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);

export const getModelName = () => process.env.GEMINI_MODEL as string;

/**
 * Starts a chat session that can call our tools.
 * A "chat" remembers the conversation, so each tool result we send back
 * is added to the history and the model sees everything so far.
 */
/**
 * Returns the raw model. The agent keeps its own conversation history and calls
 * generateContent each round (the chat helper in this SDK version labels tool
 * results with a role the newer Gemini API rejects).
 */
export const createAgentModel = (
  systemInstruction: string,
  functionDeclarations: FunctionDeclaration[]
): GenerativeModel => {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL;
  if (!apiKey || !modelName) {
    throw new Error("GEMINI_API_KEY and GEMINI_MODEL must be set");
  }
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools: [{ functionDeclarations }],
    generationConfig: { temperature: 0.2 },
  });
};

export const createAgentChat = (
  systemInstruction: string,
  functionDeclarations: FunctionDeclaration[]
): ChatSession => {
  // Read env INSIDE the function, not at the top of the file. server.ts calls
  // dotenv.config() after the imports run, so top-level reads can be undefined.
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL;
  if (!apiKey || !modelName) {
    throw new Error("GEMINI_API_KEY and GEMINI_MODEL must be set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools: [{ functionDeclarations }],
    generationConfig: { temperature: 0.2 }, // low = more factual, less creative
  });

  return model.startChat();
};
