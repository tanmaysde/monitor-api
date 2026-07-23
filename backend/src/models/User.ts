import mongoose, { Document } from "mongoose";
import { Iuser } from "../types/user.types";

export interface IUserDocument extends Iuser, Document {}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    name: { type: String, required: [true, "Name is required"], trim: true},
    email: { type: String,required: [true, "Email is required"], trim: true,unique: true,lowercase: true},
    password: {type:String, required: [true, "Password is required"]},
    tokenVersion: {type:Number, default:0,required:true}
  },
  { timestamps: true },
);

export default mongoose.model<IUserDocument>("User", userSchema);
