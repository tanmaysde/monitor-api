import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Incident from "../models/Incident";
import { createTools, ToolContext } from "../services/ai.tools";

(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);

  const incident = await Incident.findOne({ title: /Auth Service/i });
  if (!incident) throw new Error("Demo incident not found. Is MONGO_URI the demo database?");

  const ctx: ToolContext = {
    workspaceId: incident.workspaceId,
    monitorId: incident.monitorId,
    anchorTime: incident.timeline[0]?.timestamp || incident.createdAt,
  };

    const tools = createTools(ctx);

  for (const t of tools) {
    // Each tool has a different input type, so TypeScript can't type .invoke() across
    // the whole list. Casting is fine here: this is only a test script.
    const result = await (t as any).invoke({});
    console.log(`\n=== ${t.name} ===`);
    console.log(String(result).slice(0, 300));
  }
})()
  .catch((e) => console.error("FAILED:", e.message))
  .finally(() => mongoose.disconnect());

