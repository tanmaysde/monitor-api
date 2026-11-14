import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Incident from "../models/Incident";

(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);

  const incident = await Incident.findOne({ title: /Auth Service/i });
  if (!incident) throw new Error("Demo incident not found. Is MONGO_URI the demo database?");
  // 1. Write a sample analysis and read it back
  await Incident.updateOne(
    { _id: incident._id },
    { $set: { analysis: { status: "DONE", probableCause: "Test cause", confidence: "HIGH", evidence: ["fact 1"] } } }
  );
  const saved = await Incident.findById(incident._id).lean();
  console.log("Saved analysis:", saved?.analysis);
  // 2. An invalid status must be rejected by the schema
  try {
    await Incident.updateOne(
      { _id: incident._id },
      { $set: { analysis: { status: "BROKEN" } } },
      { runValidators: true }
    );
    console.log("FAIL: invalid status was accepted");
  } catch (err: any) {
    console.log("OK: invalid status rejected ->", err.message.slice(0, 80));
  }
  // 3. Clean up: remove the test analysis
  await Incident.updateOne({ _id: incident._id }, { $unset: { analysis: "" } });
  console.log("Cleaned up.");
})()
  .catch((e) => console.error("FAILED:", e.message))
  .finally(() => mongoose.disconnect());
