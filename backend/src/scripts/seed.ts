/**
 * Seeds a "Demo Workspace" with realistic monitors, logs, incidents and exceptions.
 *
 *   npm run seed            -> wipe the previous demo data and recreate it
 *   npm run seed -- --clean -> only remove the demo data
 *
 * Safety: connects to SEED_MONGO_URI (NOT MONGO_URI) so you cannot seed your real
 * database by accident. Only the demo user's workspace and its data are touched.
 *
 * Login after seeding:  demo@example.com / Demo@1234
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Workspace from "../models/Workspace";
import Monitor from "../models/Monitor";
import Log from "../models/Log";
import Incident from "../models/Incident";
import ExceptionIssue from "../models/ExceptionIssue";
import ExceptionEvent from "../models/ExceptionEvent";

dotenv.config();

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_WORKSPACE = "Demo Workspace";
const DAYS = 7;
const CHECK_EVERY_MIN = 15;

// Small seeded PRNG so every run produces the same data.
let seedState = 42;
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

type LogShape = {
  status: "UP" | "DOWN";
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
};

interface Scenario {
  name: string;
  url: string;
  extra?: Record<string, unknown>;
  // Produces one check result. minutesBack = how long ago the check happened.
  check: (minutesBack: number) => LogShape;
}

const ok = (base: number, jitter: number): LogShape => ({
  status: "UP",
  responseTime: between(base, base + jitter),
  statusCode: 200,
});

const scenarios: Scenario[] = [
  {
    name: "Healthy API",
    url: "https://api.demo-healthy.example.com/health",
    check: () => ok(80, 120),
  },
  {
    name: "Slow Reports Service",
    url: "https://reports.demo-slow.example.com/status",
    // Latency creeps up over the week, spikes in the last 3 hours.
    check: (m) => ok(m < 180 ? 1800 : 400 + (DAYS * 1440 - m) / 60, 500),
  },
  {
    name: "Flaky Payments API",
    url: "https://payments.demo-flaky.example.com/ping",
    check: () =>
      rand() < 0.12
        ? { status: "DOWN", responseTime: between(3000, 5000), statusCode: 503, errorMessage: "Service Unavailable" }
        : ok(150, 200),
  },
  {
    name: "Auth Service (DOWN now)",
    url: "https://auth.demo-down.example.com/login",
    // Healthy until 40 minutes ago, then hard down.
    check: (m) =>
      m < 40
        ? { status: "DOWN", responseTime: 10000, errorMessage: "timeout of 10000ms exceeded" }
        : ok(100, 100),
  },
  {
    name: "Legacy Site (expired SSL)",
    url: "https://legacy.demo-ssl.example.com",
    extra: {
      sslInfo: {
        isHttps: true,
        validFrom: minutesAgo(60 * 24 * 400),
        validTo: minutesAgo(60 * 24 * 3),
        daysRemaining: -3,
        issuer: "Demo CA",
        isValid: false,
        isExpired: true,
        error: "certificate has expired",
      },
    },
    // Fine until the certificate expired 3 days ago.
    check: (m) =>
      m < 60 * 24 * 3
        ? { status: "DOWN", responseTime: 300, errorMessage: "certificate has expired" }
        : ok(200, 100),
  },
  {
    name: "Marketing DNS (resolution failing)",
    url: "https://www.demo-dns.example.com",
    extra: { type: "DNS", dnsRecordType: "A" },
    check: (m) =>
      m < 90
        ? { status: "DOWN", responseTime: 0, errorMessage: "getaddrinfo ENOTFOUND www.demo-dns.example.com" }
        : ok(30, 40),
  },
];

async function cleanDemoData() {
  const user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) return;
  const workspaces = await Workspace.find({ ownerId: user._id, name: DEMO_WORKSPACE });
  const ids = workspaces.map((w) => w._id);
  if (ids.length) {
    await Promise.all([
      Monitor.deleteMany({ workspaceId: { $in: ids } }),
      Log.deleteMany({ workspaceId: { $in: ids } }),
      Incident.deleteMany({ workspaceId: { $in: ids } }),
      ExceptionEvent.deleteMany({ workspaceId: { $in: ids } }),
      ExceptionIssue.deleteMany({ workspaceId: { $in: ids } }),
      Workspace.deleteMany({ _id: { $in: ids } }),
    ]);
  }
  await User.deleteOne({ _id: user._id });
}

async function seed() {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({ name: "Demo User", email: DEMO_EMAIL, password: hashed, tokenVersion: 0 });
  const workspace = await Workspace.create({
    name: DEMO_WORKSPACE,
    ownerId: user._id,
    members: [{ userId: user._id, role: "OWNER" }],
  });

  const monitorsByName = new Map<string, mongoose.Types.ObjectId>();
  const logs: Record<string, unknown>[] = [];

  for (const s of scenarios) {
    const checks: { minutesBack: number; result: LogShape }[] = [];
    for (let m = DAYS * 1440; m >= 0; m -= CHECK_EVERY_MIN) {
      checks.push({ minutesBack: m, result: s.check(m) });
    }
    const latest = checks[checks.length - 1];

    const monitor = await Monitor.create({
      name: s.name,
      url: s.url,
      workspaceId: workspace._id,
      interval: CHECK_EVERY_MIN,
      status: latest.result.status,
      lastCheckedAt: minutesAgo(latest.minutesBack),
      lastResponseTime: latest.result.responseTime,
      ...s.extra,
    });
    monitorsByName.set(s.name, monitor._id as mongoose.Types.ObjectId);

    for (const c of checks) {
      logs.push({
        monitorId: monitor._id,
        workspaceId: workspace._id,
        checkedAt: minutesAgo(c.minutesBack),
        ...c.result,
      });
    }
  }
  await Log.insertMany(logs);

  const id = (name: string) => monitorsByName.get(name)!;
  const incident = (
    name: string,
    title: string,
    severity: "INFO" | "WARNING" | "CRITICAL",
    openedMinAgo: number,
    resolvedMinAgo?: number
  ) => {
    const timeline: Record<string, unknown>[] = [
      { status: "TRIGGERED", action: "Incident triggered automatically", timestamp: minutesAgo(openedMinAgo) },
    ];
    if (resolvedMinAgo !== undefined) {
      timeline.push({ status: "RESOLVED", action: "Monitor recovered automatically", timestamp: minutesAgo(resolvedMinAgo) });
    }
    return {
      workspaceId: workspace._id,
      monitorId: id(name),
      title,
      severity,
      status: resolvedMinAgo !== undefined ? "RESOLVED" : "TRIGGERED",
      resolvedAt: resolvedMinAgo !== undefined ? minutesAgo(resolvedMinAgo) : undefined,
      timeline,
    };
  };

  await Incident.insertMany([
    incident("Auth Service (DOWN now)", "Auth Service is DOWN", "CRITICAL", 40),
    incident("Marketing DNS (resolution failing)", "Marketing DNS is DOWN", "CRITICAL", 90),
    incident("Legacy Site (expired SSL)", "Legacy Site is DOWN", "WARNING", 60 * 24 * 3),
    incident("Flaky Payments API", "Payments API is DOWN", "CRITICAL", 60 * 30, 60 * 30 - 25),
    incident("Flaky Payments API", "Payments API is DOWN", "CRITICAL", 60 * 80, 60 * 80 - 45),
  ]);

  // Exceptions that line up with the Auth outage (last ~40 minutes) so the AI
  // analyst has related evidence to find. A couple of unrelated older ones too.
  const issues = [
    { errorType: "ConnectionError", message: "ECONNREFUSED 10.0.3.14:5432 (postgres)", count: 37, since: 38, last: 1 },
    { errorType: "TimeoutError", message: "Auth DB query exceeded 10000ms", count: 12, since: 35, last: 2 },
    { errorType: "TypeError", message: "Cannot read properties of undefined (reading 'name')", count: 5, since: 60 * 50, last: 60 * 20 },
  ];
  for (const i of issues) {
    const issue = await ExceptionIssue.create({
      workspaceId: workspace._id,
      hash: `${i.errorType}:${i.message}`.slice(0, 60),
      errorType: i.errorType,
      message: i.message,
      count: i.count,
      firstSeen: minutesAgo(i.since),
      lastSeen: minutesAgo(i.last),
      browsers: { Chrome: Math.ceil(i.count * 0.7), Safari: Math.floor(i.count * 0.3) },
      os: { Windows: Math.ceil(i.count * 0.5), macOS: Math.floor(i.count * 0.5) },
      urls: { "/login": i.count },
    });
    const events = Array.from({ length: Math.min(i.count, 10) }, (_, k) => ({
      issueId: issue._id,
      workspaceId: workspace._id,
      errorType: i.errorType,
      message: i.message,
      stack: `${i.errorType}: ${i.message}\n    at authenticate (auth.service.js:88:11)\n    at login (auth.controller.js:21:5)`,
      url: "/login",
      timestamp: minutesAgo(i.since - ((i.since - i.last) * k) / 10),
    }));
    await ExceptionEvent.insertMany(events);
  }

  console.log(`Seeded ${scenarios.length} monitors, ${logs.length} logs, 5 incidents, ${issues.length} issues.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function main() {
  const uri = process.env.SEED_MONGO_URI;
  if (!uri) {
    console.error("SEED_MONGO_URI is not set. Point it at a local or throwaway database (not your real one).");
    process.exit(1);
  }
  if (uri === process.env.MONGO_URI && !process.argv.includes("--allow-main-db")) {
    console.error("SEED_MONGO_URI equals MONGO_URI. Refusing to seed your main database (pass --allow-main-db to override).");
    process.exit(1);
  }

  await mongoose.connect(uri);
  await cleanDemoData();
  if (process.argv.includes("--clean")) {
    console.log("Demo data removed.");
  } else {
    await seed();
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
