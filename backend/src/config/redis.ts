import Redis from "ioredis";
import logger from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isTls = redisUrl.startsWith("rediss://");

const redisClient = new Redis(redisUrl, {
  tls: isTls ? {} : undefined,   // Enable TLS for Upstash (rediss://) connections
  maxRetriesPerRequest: 3,       // Prevent crash by limiting retries
  connectTimeout: 10000,         // 10s connection timeout
  lazyConnect: false,
  enableOfflineQueue: true,
});

redisClient.on("connect", () => {
  logger.info("Redis connected successfully");
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error: %o", err);
});

export default redisClient;
