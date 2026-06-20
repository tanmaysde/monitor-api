import {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request{
  user?:any
}

export default function auth(
  req:AuthRequest,
  res:Response,
  next:NextFunction
){

  const authHeader = req.headers.authorization

  if(!authHeader){
    return res.status(401).json({message:"No token"})
  }

  let token = authHeader;
  if(authHeader.startsWith("Bearer")){
    token = authHeader.split(" ")[1]
  }

  try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET as string)
    req.user = decoded;
    next()
  } catch (error) {
    return res.status(401).json({message:"Invalid token"})
  }
}