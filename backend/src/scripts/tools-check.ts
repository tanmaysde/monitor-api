/**
 * Smoke test: run each SRE tool manually and print the results.
 * Usage:  npx ts-node-dev src/scripts/tools-check.ts
 * (MONGO_URI must point at the demo database — run `npm run seed` first.)
 */
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Incident from "../models/Incident";
import { createTools, ToolContext } from "../services/ai.tools";

(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);

  const incident = await Incident.findOne({ title: /Auth Service/i });
  if (!incident) {
    console.log("No 'Auth Service' incident found. Is MONGO_URI pointing at the demo db?");
    return;
  }

  const ctx: ToolContext = {
    workspaceId: incident.workspaceId,
    monitorId: incident.monitorId,
    anchorTime: incident.timeline[0]?.timestamp || incident.createdAt,
  };

  const tools = createTools(ctx);

  for (const t of tools) {
    console.log(`\n=== ${t.name} ===`);
    try {
      const result = await (t as any).invoke({});
      console.log(typeof result === "string" ? result.slice(0, 500) : result);
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }
})()
  .catch((e) => console.error("FAILED:", e))
  .finally(() => mongoose.disconnect());
