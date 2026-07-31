import mongoose, { Document } from "mongoose";
import { IMonitor } from "../types/monitor.types";

export interface IMonitorDocument extends IMonitor, Document {}

const assertionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["STATUS_CODE", "RESPONSE_TIME", "TEXT_BODY", "JSON_PATH"],
      required: true,
    },
    operator: {
      type: String,
      enum: ["EQUALS", "NOT_EQUALS", "CONTAINS", "NOT_CONTAINS", "GREATER_THAN", "LESS_THAN"],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    target: {
      type: String,
    },
  },
  { _id: false } // Auto generation of sub-document _id disabled for lightweight data
);

const monitorSchema = new mongoose.Schema<IMonitorDocument>(
  {
    name: {
      type: String,
      required: [true, "Monitor name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Monitor url is required"],
      trim: true
    },
    method: { type: String, 
      enum:["GET","POST","PUT","DELETE","PATCH"],
      default: "GET",
      uppercase: true,
   },
    interval: { type: Number, default: 5, min:[1,"Interval must be at least 1 minute"]},
    retries: { type: Number, default: 3, min: 0, max: 5 },
    retryInterval: { type: Number, default: 10, min: 5, max: 60 },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    status:{
      type:String,
      enum:["UP","DOWN","UNKNOWN"],
      default:"UNKNOWN"
    },
    lastCheckedAt:{
      type:Date
    },
    lastResponseTime:{
      type:Number,
      default:0
    },
    sslInfo: {
      isHttps: { type: Boolean, default: false },
      validTo: { type: Date },
      validFrom: { type: Date },
      daysRemaining: { type: Number },
      issuer: { type: String },
      isValid: { type: Boolean },
      isExpired: { type: Boolean },
      error: { type: String },
    },
    type:{
      type: String,
      enum: ["HTTP", "TCP", "PING", "DNS"],
      default: "HTTP",
      required: true
    },
    port: {
      type: Number,
    },
    dnsRecordType: {
      type: String,
      enum: ["A", "AAAA", "CNAME", "MX", "TXT"],
    },
    assertions: {
      type: [assertionSchema],
      default: []
    }
  },
  { timestamps: true },
);

export default mongoose.model<IMonitorDocument>("Monitor", monitorSchema);
