/**
 * Quick smoke test: can we talk to the Gemini model via LangChain?
 * Usage:  npx ts-node-dev src/scripts/llm-ping.ts
 */
import dotenv from "dotenv";
dotenv.config();
import { createChatModel } from "../services/llm.service";
import { HumanMessage } from "@langchain/core/messages";

(async () => {
  const model = createChatModel();
  const response = await model.invoke([new HumanMessage("Reply with the single word: pong")]);
  console.log("Model said:", response.content);
})().catch((e) => console.error("FAILED:", e.message));
