import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  logoutUser,
  revokeAllSessions,
  demoLogin,
} from "../controllers/auth.controller";
import auth from "../middlewares/auth";
import { blockDemoAccount } from "../middlewares/demo";

const router = Router();

// The demo button is public: keep it from being used to flood token creation
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many demo logins from this network. Please try again later." },
});

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/demo", demoLimiter, demoLogin);         // One-click read-only demo (DEMO_LOGIN_ENABLED)
router.post("/refresh", refreshAccessToken); // Expects the Refresh Cookie
router.post("/logout", logoutUser);           // Clears the Refresh Cookie

// Protected routes (requires valid Access Token)
// Blocked for the shared demo account: it would log every other demo visitor out.
router.post("/revoke", auth, blockDemoAccount, revokeAllSessions); // Revokes all active sessions globally

export default router;
