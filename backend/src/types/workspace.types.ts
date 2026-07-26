import { Types } from "mongoose";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface IWorkspaceMember {
  userId: Types.ObjectId; 
  role: WorkspaceRole;
}

export interface IWorkspace {
  name: string;
  ownerId: Types.ObjectId;
  members: IWorkspaceMember[];
  createdAt?: Date;
  updatedAt?: Date;
}
