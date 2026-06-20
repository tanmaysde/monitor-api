import { Router } from "express";
import auth from "../middlewares/auth";
import { createMonitor,getMonitorById,getMonitors,updateMonitor,deleteMonitor,runMonitorCheck,getMonitorLogs,getMonitorAnalytics,getMonitorEvents } from "../controllers/monitor.controller";

const router = Router();

router.post("/",auth,createMonitor);
router.get("/",auth,getMonitors);

router.post("/:id/check",auth,runMonitorCheck)
router.get("/:id/logs", auth, getMonitorLogs);
router.get("/:id/analytics", auth, getMonitorAnalytics);
router.get("/:id/events", auth, getMonitorEvents);


router.get("/:id",auth,getMonitorById)
router.put("/:id",auth,updateMonitor)
router.delete("/:id",auth,deleteMonitor)

export default router;