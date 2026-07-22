import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export default async function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  let token = authHeader;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  try {
    // 1. Verify the signature and decode the Access Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // 2. Fetch the user from MongoDB to check their current tokenVersion
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // 3. Compare the tokenVersion from when the token was issued (we will include this in the payload)
    // If the database version is higher (due to a password change or global logout), reject!
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Session revoked. Please log in again." });
    }

    // Attach decoded user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
