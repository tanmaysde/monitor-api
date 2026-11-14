import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * The public "Try the live demo" account.
 *
 * Visitors share ONE account that is a VIEWER in the demo workspace, so every
 * workspace-scoped change is already refused by the role checks. This file covers
 * the few actions that are not workspace-scoped.
 */
export const isDemoLoginEnabled = () => process.env.DEMO_LOGIN_ENABLED === "true";

export const getDemoEmail = () =>
  (process.env.DEMO_LOGIN_EMAIL || "demo-viewer@example.com").trim().toLowerCase();

export const isDemoAccount = (email: unknown) =>
  typeof email === "string" && email.toLowerCase() === getDemoEmail();

/** Blocks the shared demo account from an action (use after the `auth` middleware). */
export const blockDemoAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (isDemoAccount(req.user?.email)) {
    return res.status(403).json({ message: "This action is not available in the read-only demo." });
  }
  next();
};
