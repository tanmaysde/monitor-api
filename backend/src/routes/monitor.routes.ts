import { Router } from "express";
import auth from "../middlewares/auth";
import { createMonitor,getMonitorById,getMonitors,updateMonitor,deleteMonitor,runMonitorCheck,getMonitorLogs,getMonitorAnalytics,getMonitorEvents } from "../controllers/monitor.controller";
import { checkWorkspaceRole } from "../middlewares/rbac";

const router = Router();

router.post("/", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createMonitor);
router.get("/", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getMonitors);
router.get("/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getMonitorById);
router.put("/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), updateMonitor);
router.delete("/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), deleteMonitor);
router.post("/:id/check", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), runMonitorCheck);
router.get("/:id/logs", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getMonitorLogs);
router.get("/:id/analytics", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getMonitorAnalytics);
router.get("/:id/events", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getMonitorEvents);


export default router;