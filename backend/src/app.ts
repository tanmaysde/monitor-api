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
  message: { message: "Too many requests, please try again later." },
});

const app = express();

// Trust reverse proxies (Render, Railway, Nginx, Vercel)
app.set("trust proxy", 1);

const allowedOrigins = [
  "https://monitor-api-frontend.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, sendBeacon)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".onrender.com") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      return callback(null, origin);
    }

    return callback(null, origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200,
};

// ⚡ 1. CORS MUST BE THE VERY FIRST MIDDLEWARE (Handles preflights automatically for all routes)
app.use(cors(corsOptions));

// ⚡ 2. Helmet configured with CORP disabled so errors don't trigger browser CORP blocks
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json());

// ⚡ 3. Handle JSON Body Parsing Errors cleanly
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
  // 1. Mongoose Connection Check
  // readyState codes: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = mongoose.connection.readyState === 1 ? "UP" : "DOWN";

  // 2. Redis Connection Check
  // status states: "ready", "connect", "connecting", "close", "end", etc.
  const cacheStatus = redisClient.status === "ready" ? "UP" : "DOWN";

  const isHealthy = dbStatus === "UP" && cacheStatus === "UP";

  // 3. Return 200 if fully healthy, or 503 Service Unavailable if any service is down
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "UP" : "DOWN",
    timestamp: new Date(),
    services: {
      database: dbStatus,
      cache: cacheStatus,
    },
  });
});


//routes
app.use("/api/auth",authRoutes)
app.use("/api/workspaces", workspaceRoutes); 
app.use("/api/monitors",monitorRoutes)
app.use("/api/workflows", workflowRoutes);
app.use("/api/incidents", incidentRoutes); 
app.use("/api/errors", exceptionRoutes);


app.get("/",(_req,res)=>{
  res.send("API monitoring tool required")
})

// Global Error Handler (Guarantees CORS headers on all backend errors)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

export default app;