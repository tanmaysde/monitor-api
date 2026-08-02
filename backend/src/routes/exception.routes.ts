import { Router } from "express";
import auth from "../middlewares/auth";
import { checkWorkspaceRole } from "../middlewares/rbac";
import {
  ingestException,
  serveSdk,
  getIssues,
  getIssueById,
  getIssueEvents,
  updateIssueStatus,
  deleteIssue,
  getExceptionStats,
} from "../controllers/exception.controller";

const router = Router();

// 🌐 Public Endpoints (No JWT required for client SDK error shipping)
router.post("/ingest", ingestException);
router.get("/sdk.js", serveSdk);

// 🔒 Protected Endpoints (Workspace Member Access Required)
router.get("/issues", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getIssues);
router.get("/stats", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getExceptionStats);
router.get("/issues/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getIssueById);
router.get("/issues/:id/events", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getIssueEvents);
router.put("/issues/:id/status", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), updateIssueStatus);
router.delete("/issues/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), deleteIssue);

export default router;
