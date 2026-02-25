import PlatformModule from '../../models/platform/module.model.js';
import * as homeSectionService from '../../services/homeSection.service.js';
import RedisCache from '../../utils/redisCache.js';
import { catchAsync, APIError } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// ─── GET /api/v1/platform/modules ────────────────────────────────────────────
export const getPublicModules = catchAsync(async (req, res) => {
    const modules = await PlatformModule.find({ isActive: true, isVisible: true })
        .sort({ order: 1 })
        .select('title image icon slug type routePath')
        .lean();
    return res.status(200).json(new ApiResponse(200, modules, 'Active platform modules fetched successfully'));
});

// ─── GET /api/v1/home/:moduleSlug ─────────────────────────────────────────────
export const getHome = catchAsync(async (req, res) => {
    const { moduleSlug } = req.params;

    // 1. Cache check — fast path
    const cacheKey = homeSectionService.homeCacheKey(moduleSlug);
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, 'Home fetched (cached)'));
    }

    // 2. Build full home — all sections resolved in parallel
    const data = await homeSectionService.buildHome(moduleSlug);

    // 3. Cache for 5 minutes
    await RedisCache.set(cacheKey, data, 300);

    return res.status(200).json(new ApiResponse(200, data, 'Home fetched successfully'));
});
