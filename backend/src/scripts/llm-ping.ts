import dotenv from "dotenv";
dotenv.config();
import { createAgentChat } from "../services/llm.service";

(async () => {
  const chat = createAgentChat("You are a helpful assistant.", [
    { name: "noop", description: "Does nothing" },
  ]);
  const res = await chat.sendMessage("Reply with the single word: pong");
  console.log("Model said:", res.response.text());
})().catch((e) => console.error("FAILED:", e.message));
