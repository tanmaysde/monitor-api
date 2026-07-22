import { Router } from "express";
import { 
  loginUser, 
  registerUser, 
  refreshAccessToken, 
  logoutUser, 
  revokeAllSessions 
} from "../controllers/auth.controller";
import auth from "../middlewares/auth";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken); // Expects the Refresh Cookie
router.post("/logout", logoutUser);           // Clears the Refresh Cookie

// Protected routes (requires valid Access Token)
router.post("/revoke", auth, revokeAllSessions); // Revokes all active sessions globally

export default router;
