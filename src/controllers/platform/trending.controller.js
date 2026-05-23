import * as trendingSectionService from "../../services/trendingSection.service.js";
import RedisCache from "../../utils/redisCache.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

// ─── GET /api/v1/platform/trending/:identifier ─────────────────────────────────────────────
// export const getTrending = catchAsync(async (req, res) => {
//   const { identifier } = req.params;
//   const searchKeyword = (req.query.search || "").trim();

//   // 1. Cache check — vary cache by exact search query
//   const cacheKey = trendingSectionService.trendingCacheKey(
//     identifier,
//     searchKeyword,
//   );
//   const cached = await RedisCache.get(cacheKey);
//   if (cached) {
//     return res
//       .status(200)
//       .json(new ApiResponse(200, cached, "Trending fetched (cached)"));
//   }

//   // 2. Build trending layout/products
//   const data = await trendingSectionService.buildTrending(
//     identifier,
//     searchKeyword,
//   );

//   // 3. Cache it (even search requests can be cached for a short time to reduce DB load, e.g. popular searches)
//   await RedisCache.set(cacheKey, data, 300);

//   return res
//     .status(200)
//     .json(new ApiResponse(200, data, "Trending fetched successfully"));
// });

export const getTrending = catchAsync(async (req, res) => {
  const { identifier } = req.params;

  const searchKeyword = (req.query.search || "").trim();

  // =====================================
  // CACHE KEY
  // =====================================

  const cacheKey = trendingSectionService.trendingCacheKey(
    identifier,
    searchKeyword,
  );

  // =====================================
  // CACHE CHECK
  // =====================================

  const cached = await RedisCache.get(cacheKey);

  if (cached) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, JSON.parse(cached), "Trending fetched (cached)"),
      );
  }

  // =====================================
  // BUILD TRENDING DATA
  // =====================================

  const data = await trendingSectionService.buildTrending(
    identifier,
    searchKeyword,
  );

  // =====================================
  // CACHE STORE
  // =====================================

  // Search cache -> short
  // Normal cache -> longer

  const cacheTTL = searchKeyword ? 300 : 900;

  await RedisCache.set(cacheKey, JSON.stringify(data), cacheTTL);

  // =====================================
  // RESPONSE
  // =====================================

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Trending fetched successfully"));
});
