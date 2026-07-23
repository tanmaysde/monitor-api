import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import monitorRoutes from "./routes/monitor.routes";
import authRoutes from "./routes/auth.routes";
import workflowRoutes from "./routes/workflow.routes";
import helmet from "helmet";
import cookieParser from "cookie-parser";

//rate limiting
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "./config/redis";

const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});


const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(cors());
app.use(express.json());
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
app.use("/api/monitors",monitorRoutes)
app.use("/api/workflows", workflowRoutes);

app.get("/",(_req,res)=>{
  res.send("API monitoring tool required")
})

export default app;