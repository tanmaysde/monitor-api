/**
 * Runs the AI agent on the seeded demo incidents and checks the diagnosis
 * against known right answers.   Usage:  npm run ai:eval
 * (MONGO_URI must point at the demo database: run `npm run seed` first.)
 */
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Incident from "../models/Incident";
import { runIncidentAgent } from "../services/incident.agent";

const scenarios = [
  {
    name: "Database outage (exceptions point to postgres)",
    title: /Auth Service/i,
    expect: /database|postgres|db\b|connection/i,
    expectTools: ["get_related_exceptions"],
  },
  {
    name: "Expired SSL certificate",
    title: /Legacy Site/i,
    expect: /ssl|certificate|tls|expired/i,
    expectTools: ["get_ssl_info"],
  },
  {
    name: "DNS resolution failure",
    title: /Marketing DNS/i,
    expect: /dns|resolv|ENOTFOUND/i,
    expectTools: ["dns_lookup"],
  },
  {
    name: "Intermittent 503s (flaky service)",
    title: /Payments API/i,
    expect: /intermittent|flaky|503|unavailable|overload/i,
    expectTools: ["get_recent_logs"],
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  let passed = 0;

  for (const [index, s] of scenarios.entries()) {
    // Free-tier Gemini allows ~5 requests/minute: pause between scenarios.
    if (index > 0) await new Promise((r) => setTimeout(r, Number(process.env.EVAL_PAUSE_MS ?? 25000)));
    const incident = await Incident.findOne({ title: s.title });
    if (!incident) {
      console.log(`\n[SKIP] ${s.name}: incident not found (run npm run seed)`);
      continue;
    }

    console.log(`\n=== ${s.name} ===`);
    const started = Date.now();
    try {
      const r = await runIncidentAgent(incident);
      const text = `${r.probableCause} ${r.evidence.join(" ")}`;
      const causeOk = s.expect.test(text);
      const toolsOk = s.expectTools.every((t) => r.toolCalls.some((c) => c.name === t));

      console.log(`Tools used : ${r.toolCalls.map((c) => c.name).join(", ") || "none"}`);
      console.log(`Cause      : ${r.probableCause}`);
      console.log(`Confidence : ${r.confidence}`);
      console.log(`Result     : ${causeOk && toolsOk ? "PASS" : "FAIL"} (cause match: ${causeOk}, used expected tool: ${toolsOk}) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
      if (causeOk && toolsOk) passed++;
    } catch (err: any) {
      console.log(`Result     : ERROR - ${err.message}`);
    }
  }

  console.log(`\nScore: ${passed}/${scenarios.length}`);
})()
  .catch((e) => console.error("FAILED:", e))
  .finally(() => mongoose.disconnect());
