import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { WorkspaceRequest } from "../middlewares/rbac";
import Workspace from "../models/Workspace";
import User from "../models/User";

// Create a new Workspace
export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Workspace name is required" });
    }
    const workspace = await Workspace.create({
      name,
      ownerId: req.user.id,
      members: [
        {
          userId: req.user.id,
          role: "OWNER",
        },
      ],
    });
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// List all Workspaces the user belongs to
export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const workspaces = await Workspace.find({
      "members.userId": req.user.id,
    });
    res.json(workspaces);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get details of a single Workspace
export const getWorkspaceById = async (req: WorkspaceRequest, res: Response) => {
  try {
    // Populate user profiles inside the member list
    const workspace = await Workspace.findById(req.workspace._id).populate(
      "members.userId",
      "name email"
    );
    res.json(workspace);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Invite / Add a member to a Workspace by Email
export const inviteWorkspaceMember = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }
    if (!["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }
    // 1. Locate user by email
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ message: "User with this email not registered" });
    }
    // 2. Verify if they are already in the workspace
    const workspace = req.workspace;
    const isMember = workspace.members.some(
      (m: any) => m.userId.toString() === targetUser._id.toString()
    );
    if (isMember) {
      return res.status(400).json({ message: "User is already a member of this workspace" });
    }
    // 3. Append to members list
    workspace.members.push({ userId: targetUser._id, role });
    await workspace.save();
    res.json({ message: "Member added successfully", workspace });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update a workspace member's role
export const updateWorkspaceMemberRole = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { memberUserId } = req.params;
    const { role } = req.body;
    if (!role || !["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return res.status(400).json({ message: "Valid role is required" });
    }
    const workspace = req.workspace;
    // Find the member
    const memberIndex = workspace.members.findIndex(
      (m: any) => m.userId.toString() === memberUserId
    );
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in workspace" });
    }
    // Protect against modifying OWNER
    if (workspace.members[memberIndex].role === "OWNER") {
      return res.status(400).json({ message: "Cannot modify Owner's role" });
    }
    workspace.members[memberIndex].role = role;
    await workspace.save();
    res.json({ message: "Member role updated successfully", workspace });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a member from a Workspace
export const removeWorkspaceMember = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { memberUserId } = req.params;
    const workspace = req.workspace;
    // Find the member
    const member = workspace.members.find(
      (m: any) => m.userId.toString() === memberUserId
    );
    if (!member) {
      return res.status(404).json({ message: "Member not found in workspace" });
    }
    // Protect Owner from deletion
    if (member.role === "OWNER") {
      return res.status(400).json({ message: "Cannot remove the workspace Owner" });
    }
    // Filter out member
    workspace.members = workspace.members.filter(
      (m: any) => m.userId.toString() !== memberUserId
    );
    await workspace.save();
    res.json({ message: "Member removed successfully", workspace });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};