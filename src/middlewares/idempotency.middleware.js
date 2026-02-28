import crypto from "crypto";
import redis from "../config/redis.config.js";
import { APIError } from "../middlewares/errorHandler.js";

export const idempotencyMiddleware = async (req, res, next) => {
  try {
    const key = req.headers["idempotency-key"];
    const userId = req.user.id;
    if (!key) {
      return next(new APIError(400, "Idempotency key is required"));
    }
    const cacheKey = `idempotency:${userId}:${key}`;
    const existingRequest = await redis.get(cacheKey);
    if (existingRequest) {
      return next(new APIError(400, "Request already exists"));
    }
    await redis.set(cacheKey, JSON.stringify({ key, userId }), "EX", 60 * 60 * 24);
    req.idempotencyKey = key;
    next();
  } catch (error) {
    next(error);
  }
} 