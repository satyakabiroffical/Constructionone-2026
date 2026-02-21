// Written by Pradeep
import * as bannerService from '../../services/banner.service.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/v1/banners?moduleId=xxx&page=HOME&position=TOP
 *
 * Public endpoint — returns only:
 *  - isActive = true
 *  - within startDate..endDate window (null = always show)
 *  - sorted by order ASC
 *
 * Response strips internal fields (createdBy, startDate, endDate, __v)
 */
export const getPublicBanners = catchAsync(async (req, res) => {
    const { moduleId, page, position } = req.query;

    const cacheKey = `banners:public:${moduleId}:${page}:${position || 'all'}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, 'Banners fetched successfully (cached)'));
    }

    const banners = await bannerService.getPublicBanners({ moduleId, page, position });
    await RedisCache.set(cacheKey, { banners }, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, { banners }, 'Banners fetched successfully'));
});
