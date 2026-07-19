import { Router } from "express";
import auth from "../middlewares/auth";
import {
  createWorkflow,
  getWorkflows,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowExecutions,
  testWorkflow,
} from "../controllers/workflow.controller";

const router = Router();

router.post("/", auth, createWorkflow);
router.get("/", auth, getWorkflows);
router.put("/:id", auth, updateWorkflow);
router.delete("/:id", auth, deleteWorkflow);
router.get("/:id/executions", auth, getWorkflowExecutions);
router.post("/:id/test", auth, testWorkflow);

export default router;
