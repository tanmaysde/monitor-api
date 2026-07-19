import winston from "winston";

// Define log formats for Development (pretty printed) and Production (JSON)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Include stack trace for errors
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "api-monitor-backend" },
  transports: [
    // 1. Output all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
        )
      ),
    }),
    // 2. Save errors to a local file
    new winston.transports.File({ 
      filename: "logs/error.log", 
      level: "error" 
    }),
    // 3. Save all logs to a combined local file
    new winston.transports.File({ 
      filename: "logs/combined.log" 
    }),
  ],
});

export default logger;
