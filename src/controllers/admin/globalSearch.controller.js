import redis from "../../config/redis.config.js"; // priyanshu
import { APIError } from "../../middlewares/errorHandler.js";
import { globalSearchService } from "../../services/globalSearch.service.js";

const ALLOWED_ENTITIES = new Set(["users", "vendors", "products", "orders"]);
const CACHE_TTL = 60; // seconds

export const adminGlobalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) throw new APIError(400, "Search query 'q' is required");
    if (q.length < 2)
      throw new APIError(400, "Search query must be at least 2 characters");

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    // Resolve which entity collections to include
    let entities;
    if (req.query.entities) {
      entities = req.query.entities
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => ALLOWED_ENTITIES.has(e));
      if (entities.length === 0)
        throw new APIError(
          400,
          `Invalid 'entities'. Allowed: ${[...ALLOWED_ENTITIES].join(", ")}`,
        );
    } else {
      entities = ["products"];
    }

    const cacheKey = `admin:search:${q}:p${page}:l${limit}:${entities.sort().join("+")}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), fromCache: true });
    }
    const results = await globalSearchService(q, page, limit, entities);

    const response = {
      success: true,
      message: `Search results for "${q}"`,
      query: q,
      page,
      limit,
      entities,
      results,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
