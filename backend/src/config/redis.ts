import Redis from "ioredis";
import logger from "../utils/logger";

const redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

redisClient.on("connect", () => {
  logger.info("Redis connected successfully");
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error: %o", err);
});

export default redisClient;
