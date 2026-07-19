import express from "express";
import cors from "cors";
import monitorRoutes from "./routes/monitor.routes";
import authRoutes from "./routes/auth.routes";
import workflowRoutes from "./routes/workflow.routes";
import helmet from "helmet";

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
app.use(cors());
app.use(express.json());

// Apply the limiter to all routes under "/api"
app.use("/api", apiLimiter); 


//routes
app.use("/api/auth",authRoutes)
app.use("/api/monitors",monitorRoutes)
app.use("/api/workflows", workflowRoutes);

app.get("/",(_req,res)=>{
  res.send("API monitoring tool required")
})

export default app;