import { Router } from "express";
import auth from "../middlewares/auth";
import { checkWorkspaceRole } from "../middlewares/rbac";
import {
  getIncidents,
  getIncidentById,
  acknowledgeIncident,
  resolveIncident,
  addIncidentComment,
  assignIncident,
} from "../controllers/incident.controller";

const router = Router();

// Retrieve all incidents for a workspace (all roles can view)
router.get(
  "/",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  getIncidents
);

// Retrieve details for a specific incident (all roles can view)
router.get(
  "/:id",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  getIncidentById
);

// Acknowledge incident (Admins, Owners, and Members can modify)
router.post(
  "/:id/acknowledge",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  acknowledgeIncident
);

// Resolve incident (Admins, Owners, and Members can modify)
router.post(
  "/:id/resolve",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  resolveIncident
);

// Post a comment/note (Admins, Owners, and Members can modify)
router.post(
  "/:id/comments",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  addIncidentComment
);

// Delegate / Assign Incident to a team member (Admins, Owners, and Members can modify)
router.post(
  "/:id/assign",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  assignIncident
);

export default router;
