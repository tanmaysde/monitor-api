import express from "express";
import cors from "cors";
import monitorRoutes from "./routes/monitor.routes";
import authRoutes from "./routes/auth.routes";
import workflowRoutes from "./routes/workflow.routes";

const app = express();

app.use(cors());
app.use(express.json());

//routes
app.use("/api/auth",authRoutes)
app.use("/api/monitors",monitorRoutes)
app.use("/api/workflows", workflowRoutes);

app.get("/",(_req,res)=>{
  res.send("API monitoring tool required")
})

export default app;