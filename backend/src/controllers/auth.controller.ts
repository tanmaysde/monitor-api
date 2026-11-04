import { Request,Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import bcrypt from "bcryptjs"
import Workspace from "../models/Workspace";



// Update this function at the top of auth.controller.ts:
const generateAccessToken = (user: { id: any; email: string; tokenVersion: number }) => {
  return jwt.sign(
    { id: user.id, email: user.email, tokenVersion: user.tokenVersion }, // Included tokenVersion
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );
};



const generateRefreshToken = (user: { id: any; email: string; tokenVersion: number }) => {
  const secret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string) + "-refresh";
  return jwt.sign(
    { id: user.id, email: user.email, tokenVersion: user.tokenVersion },
    secret,
    { expiresIn: "7d" }
  );
};

/**
 * Cookie attributes for the refresh token. The SAME options must be used to set and to
 * clear the cookie, otherwise browsers will not remove it.
 *  - secure: true on HTTPS (NODE_ENV=production, or COOKIE_SECURE=true)
 *  - sameSite "lax" by default. If the frontend and API are on DIFFERENT sites (e.g. a
 *    Vercel frontend + Render API) set COOKIE_SAMESITE=none (this forces secure) and
 *    set CORS_ORIGINS so only your frontend may call the API with credentials.
 * Read at call time (not at import) because dotenv loads after the imports run.
 */
const refreshCookieOptions = () => {
  const crossSite = process.env.COOKIE_SAMESITE === "none";
  const secure = crossSite || process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true, // Prevents client-side JS (and XSS attacks) from reading the cookie
    secure,
    sameSite: (crossSite ? "none" : "lax") as "none" | "lax", // lax protects against CSRF
    path: "/",
  };
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    ...refreshCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};


export const registerUser = async (req:Request,res:Response) =>{
  try {
    const {name,email,password,workspaceName} = req.body
    const existingUser = await User.findOne({email})
    
    if(existingUser) {
      return res.status(400).json({message: "User already exists"})
    }

    const hashedPassword = await bcrypt.hash(password,10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      tokenVersion: 0,
    });

    await Workspace.create({
      name: workspaceName ? workspaceName.trim() : `${user.name}'s Workspace`,
      ownerId: user._id,
      members: [
        {
          userId: user._id,
          role: "OWNER",
        },
      ],
    });

    const accessToken = generateAccessToken({ 
        id: user._id, 
        email: user.email, 
        tokenVersion: user.tokenVersion 
    });
    
    const refreshToken = generateRefreshToken({ id: user._id, email: user.email, tokenVersion: user.tokenVersion });

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: "User created successfully",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

   } catch (error:any) {
    res.status(500).json({message: error.message})
  }
}

export const loginUser = async (req:Request,res:Response) =>{
  try {
    const {email,password} = req.body;

    const user = await User.findOne({email})
    if(!user){
      return res.status(400).json({message: "Invalid credentials"})
    }

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch){
      return res.status(400).json({message: "Invalid credentials"})
    }

    const accessToken = generateAccessToken({ 
          id: user._id, 
          email: user.email, 
          tokenVersion: user.tokenVersion 
    });
    
    const refreshToken = generateRefreshToken({ id: user._id, email: user.email, tokenVersion: user.tokenVersion });

    // Without this cookie the silent token refresh fails and users are logged out after 15 minutes
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      message:"Login successful",
      token: accessToken,
      user:{
        id:user._id,
        name:user.name,
        email:user.email
      }
    })

  } catch (error:any) {
    res.status(500).json({message: error.message})
  }
}

export const refreshAccessToken = async (req: Request, res: Response) => {
  // Read the refresh token from cookie parsed by cookie-parser
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }
  try {
    const secret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string) + "-refresh";
    
    // Verify the refresh token's signature
    const decoded = jwt.verify(token, secret) as any;
    // Fetch the user from the database to check current tokenVersion
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    // CRITICAL SECURITY CHECK:
    // If the token version does not match the DB version, the token has been revoked!
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Session revoked. Please log in again." });
    }
    // Everything checks out! Generate a new Access Token
    const accessToken = generateAccessToken({ id: user._id, email: user.email,tokenVersion: user.tokenVersion  });
    res.json({
      token: accessToken,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  res.clearCookie("refreshToken", refreshCookieOptions());
  res.json({ message: "Logged out successfully" });
};


export const revokeAllSessions = async (req: any, res: Response) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Incrementing version invalidates all old tokens instantly
    user.tokenVersion += 1;
    await user.save();
    // Clear the cookie for this specific device logout flow
    res.clearCookie("refreshToken", refreshCookieOptions());
    res.json({ message: "All sessions revoked successfully. Please log in again." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};