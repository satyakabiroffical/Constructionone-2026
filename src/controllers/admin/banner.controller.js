// Written by Pradeep
import * as bannerService from '../../services/banner.service.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

const CACHE_LIST = 'banners:';
const CACHE_SINGLE = 'banner:';
const CACHE_TTL = 300; // 5 minutes

export const createBanner = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;

    const banner = await bannerService.create(req.body, req.user._id);
    await RedisCache.delete(CACHE_LIST);

    res.status(201).json(new ApiResponse(201, banner, 'Banner created successfully'));
});

export const getAllBanners = catchAsync(async (req, res) => {
    const cacheKey = `${CACHE_LIST}${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Banners fetched successfully (cached)'));

    const result = await bannerService.getAll(req.query);
    await RedisCache.set(cacheKey, result, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, result, 'Banners fetched successfully'));
});

export const getBannerById = catchAsync(async (req, res) => {
    const cacheKey = `${CACHE_SINGLE}${req.params.id}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Banner fetched successfully (cached)'));

    const banner = await bannerService.getById(req.params.id);
    await RedisCache.set(cacheKey, banner, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, banner, 'Banner fetched successfully'));
});

export const updateBanner = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;

    const banner = await bannerService.update(req.params.id, req.body);
    await Promise.all([
        RedisCache.delete(CACHE_LIST),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, banner, 'Banner updated successfully'));
});

export const deleteBanner = catchAsync(async (req, res) => {
    await bannerService.remove(req.params.id);
    await Promise.all([
        RedisCache.delete(CACHE_LIST),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, null, 'Banner deleted successfully'));
});

export const toggleBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.toggle(req.params.id);
    await Promise.all([
        RedisCache.delete(CACHE_LIST),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    res.status(200).json(
        new ApiResponse(200, { isActive: banner.isActive }, `Banner is now ${banner.isActive ? 'active' : 'inactive'}`)
    );
});
