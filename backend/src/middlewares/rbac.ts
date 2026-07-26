import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import Workspace from "../models/Workspace";
import { WorkspaceRole } from "../types/workspace.types";

// We extend standard AuthRequest to include workspace context
export interface WorkspaceRequest extends AuthRequest {
  workspace?: any;
  userWorkspaceRole?: WorkspaceRole;
}

export const checkWorkspaceRole = (allowedRoles: WorkspaceRole[]) => {
  return async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Extract workspace ID from Headers, Path parameters, Request body, or Query
      const workspaceId =
        req.headers["x-workspace-id"] ||
        req.params.workspaceId ||
        req.body.workspaceId ||
        req.query.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ message: "Workspace ID is required" });
      }
      // 2. Locate the workspace in DB
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }
      // 3. Find if user is a registered member of the workspace
      const member = workspace.members.find(
        (m) => m.userId.toString() === req.user.id.toString()
      );
      if (!member) {
        return res
          .status(403)
          .json({ message: "You are not a member of this workspace" });
      }
      // 4. Verify permission level/role access
      if (!allowedRoles.includes(member.role)) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions inside this workspace" });
      }
      // 5. Attach references to request object for downstream controllers
      req.workspace = workspace;
      req.userWorkspaceRole = member.role;
      next();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
};