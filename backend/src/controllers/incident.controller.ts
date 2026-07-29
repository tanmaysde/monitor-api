import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { WorkspaceRequest } from "../middlewares/rbac";
import Incident from "../models/Incident";
import User from "../models/User";

// 1. Get all incidents for the active Workspace
export const getIncidents = async (req: any, res: Response) => {
  try {
    const workspaceId = req.workspace._id;
    const { status, severity, assignedTo } = req.query;
    const query: any = { workspaceId };
    
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    if (assignedTo) {
      if (assignedTo === "me") {
        query.assignedTo = req.user.id;
      } else if (assignedTo === "unassigned") {
        query.assignedTo = null;
      } else {
        query.assignedTo = assignedTo;
      }
    }

    const incidents = await Incident.find(query)
      .populate("monitorId", "name url")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get details for a specific Incident
export const getIncidentById = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({
      _id: id,
      workspaceId: req.workspace._id,
    })
      .populate("monitorId", "name url method")
      .populate("assignedTo", "name email")
      .populate("timeline.userId", "name email")
      .populate("comments.userId", "name email");
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    res.json(incident);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Acknowledge and Assign Incident to current user
export const acknowledgeIncident = async (req: AuthRequest & WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const incident = await Incident.findOne({
      _id: id,
      workspaceId: req.workspace._id,
    });
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.status !== "TRIGGERED") {
      return res.status(400).json({ message: `Cannot acknowledge incident in status: ${incident.status}` });
    }
    incident.status = "ACKNOWLEDGED";
    incident.assignedTo = userId;
    incident.acknowledgedAt = new Date();
    incident.timeline.push({
      status: "ACKNOWLEDGED",
      action: `Incident acknowledged and assigned to ${req.user.name || req.user.email}.`,
      timestamp: new Date(),
      userId,
    });
    await incident.save();
    res.json({ message: "Incident acknowledged successfully", incident });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Manually Resolve an Incident
export const resolveIncident = async (req: AuthRequest & WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const incident = await Incident.findOne({
      _id: id,
      workspaceId: req.workspace._id,
    });
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    if (incident.status === "RESOLVED") {
      return res.status(400).json({ message: "Incident is already resolved" });
    }
    incident.status = "RESOLVED";
    incident.resolvedAt = new Date();
    incident.timeline.push({
      status: "RESOLVED",
      action: `Incident manually resolved by ${req.user.name || req.user.email}.`,
      timestamp: new Date(),
      userId,
    });
    await incident.save();
    res.json({ message: "Incident resolved successfully", incident });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// 5. Add a comment/troubleshooting note
export const addIncidentComment = async (req: AuthRequest & WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }
    const incident = await Incident.findOne({
      _id: id,
      workspaceId: req.workspace._id,
    });
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    incident.comments.push({
      userId,
      userName: req.user.name || "Teammate",
      content: content.trim(),
      timestamp: new Date(),
    });
    await incident.save();
    res.json({ message: "Comment added successfully", incident });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Assign Incident to a workspace member
export const assignIncident = async (req: AuthRequest & WorkspaceRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Target user to assign to

    if (!userId) {
      return res.status(400).json({ message: "userId is required to assign incident" });
    }

    const incident = await Incident.findOne({
      _id: id,
      workspaceId: req.workspace._id,
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // Verify the target user exists and is a member of this workspace
    const isMember = req.workspace.members.some(
      (m: any) => m.userId.toString() === userId.toString()
    ) || req.workspace.ownerId.toString() === userId.toString();

    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this workspace" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    // Update status to ACKNOWLEDGED if it was TRIGGERED
    if (incident.status === "TRIGGERED") {
      incident.status = "ACKNOWLEDGED";
      incident.acknowledgedAt = new Date();
    }

    incident.assignedTo = targetUser._id;
    incident.timeline.push({
      status: incident.status,
      action: `Incident assigned to ${targetUser.name || targetUser.email} by ${req.user.name || req.user.email}.`,
      timestamp: new Date(),
      userId: req.user.id,
    });

    await incident.save();
    res.json({ message: `Incident successfully assigned to ${targetUser.name}`, incident });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};