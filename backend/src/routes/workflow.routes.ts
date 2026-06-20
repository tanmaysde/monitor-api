import { Router } from "express";
import auth from "../middlewares/auth";
import {
  createWorkflow,
  getWorkflows,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowExecutions,
} from "../controllers/workflow.controller";

const router = Router();

router.post("/", auth, createWorkflow);
router.get("/", auth, getWorkflows);
router.get("/:id/executions", auth, getWorkflowExecutions);
router.put("/:id", auth, updateWorkflow);
router.delete("/:id", auth, deleteWorkflow);

export default router;