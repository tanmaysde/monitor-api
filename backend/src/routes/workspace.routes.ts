import { Router } from "express";
import auth from "../middlewares/auth";
import { checkWorkspaceRole } from "../middlewares/rbac";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  inviteWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "../controllers/workspace.controller";

const router = Router();

// Create and List Workspaces (Requires only standard JWT Auth)
router.post("/", auth, createWorkspace);
router.get("/", auth, getMyWorkspaces);

router.get(
  "/:workspaceId",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  getWorkspaceById
);
router.put(
  "/:workspaceId/members/:memberUserId",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN"]),
  updateWorkspaceMemberRole
);
router.post(
  "/:workspaceId/members",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN"]),
  inviteWorkspaceMember
);
router.delete(
  "/:workspaceId/members/:memberUserId",
  auth,
  checkWorkspaceRole(["OWNER", "ADMIN"]),
  removeWorkspaceMember
);
export default router;