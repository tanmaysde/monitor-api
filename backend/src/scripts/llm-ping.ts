import dotenv from "dotenv";
dotenv.config();
import { HumanMessage } from "@langchain/core/messages";
import { createChatModel } from "../services/llm.service";

(async () => {
  const model = createChatModel();
  const response = await model.invoke([new HumanMessage("Reply with the single word: pong")]);
  console.log("Model said:", response.content);
})().catch((e) => console.error("FAILED:", e.message));
