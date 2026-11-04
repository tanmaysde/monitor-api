import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Incident from "../models/Incident";
import { executeTool,ToolContext } from './../../src/services/ai.tools';

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

  for (const name of [
    "get_recent_logs",
    "get_ssl_info",
    "get_related_exceptions",
    "get_other_monitor_statuses",
    "dns_lookup",
  ]) {
    const r = await executeTool(name, {}, ctx);
    console.log(`\n=== ${name} ===\n${r.summary}`);
  }
})()
  .catch((e) => console.error("FAILED:", e))
  .finally(() => mongoose.disconnect());
