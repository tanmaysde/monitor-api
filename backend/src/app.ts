import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import monitorRoutes from "./routes/monitor.routes";
import authRoutes from "./routes/auth.routes";
import workflowRoutes from "./routes/workflow.routes";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import workspaceRoutes from "./routes/workspace.routes";
import incidentRoutes from "./routes/incident.routes"; 
import exceptionRoutes from "./routes/exception.routes";
import rateLimit from "express-rate-limit";
import redisClient from "./config/redis";

// Rate limiting middleware (resilient memory/redis fallback)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS", // ⚡ Never rate limit preflight OPTIONS requests
  message: { message: "Too many requests, please try again later." },
});

const app = express();

// Trust reverse proxies (Render, Railway, Nginx, Vercel)
app.set("trust proxy", 1);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, postman, sendBeacon, curl)
    if (!origin) return callback(null, true);
    // Dynamically reflect requesting origin to satisfy W3C credentials: true specification
    return callback(null, origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200,
};

// ⚡ 1. CORS MUST BE THE VERY FIRST MIDDLEWARE
app.use(cors(corsOptions));

// ⚡ 2. GUARANTEED PREFLIGHT OPTIONS HANDLER
// Intercepts all HTTP OPTIONS requests and immediately returns 200 OK with CORS headers
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ⚡ 3. Helmet configured with CORP disabled so errors don't trigger browser CORP blocks
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json());

// ⚡ 4. Handle JSON Body Parsing Errors cleanly
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }
  next(err);
});

// Apply the limiter to all routes under "/api"
app.use("/api", apiLimiter); 

// GET /healthz - Public Health Check Endpoint
app.get("/healthz", async (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "UP" : "DOWN";
  const cacheStatus = redisClient.status === "ready" ? "UP" : "DOWN";
  const isHealthy = dbStatus === "UP" && cacheStatus === "UP";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "UP" : "DOWN",
    timestamp: new Date(),
    services: {
      database: dbStatus,
      cache: cacheStatus,
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes); 
app.use("/api/monitors", monitorRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/incidents", incidentRoutes); 
app.use("/api/errors", exceptionRoutes);

app.get("/", (_req, res) => {
  res.send("API monitoring tool backend active");
});

// Global Error Handler (Guarantees CORS headers on all backend errors)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

export default app;