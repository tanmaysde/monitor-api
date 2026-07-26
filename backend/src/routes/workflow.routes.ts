import { Router } from "express";
import auth from "../middlewares/auth";
import { checkWorkspaceRole } from "../middlewares/rbac";

import {
  createWorkflow,
  getWorkflows,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowExecutions,
  testWorkflow,
} from "../controllers/workflow.controller";

const router = Router();

router.post("/", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createWorkflow);
router.get("/", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkflows);
router.put("/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), updateWorkflow);
router.delete("/:id", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), deleteWorkflow);
router.get("/:id/executions", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkflowExecutions);
router.post("/:id/test", auth, checkWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), testWorkflow);


export default router;
