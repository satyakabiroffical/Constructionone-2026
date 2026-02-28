/**
 * Written by Pradeep
 */
import * as pcategoryService from '../../services/pcategory.service.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

const CACHE_PREFIX = 'pcategories:';
const SINGLE_PREFIX = 'pcategory:';
const CACHE_TTL = 300; // 5 minutes

export const createPcategory = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;
    const pcategory = await pcategoryService.create(req.body, req.user._id);

    // Invalidate all list caches
    await RedisCache.delete(CACHE_PREFIX);

    res.status(201).json(new ApiResponse(201, pcategory, 'Pcategory created successfully'));
});

export const getAllPcategories = catchAsync(async (req, res) => {
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Pcategories fetched successfully (cached)'));

    const result = await pcategoryService.getAll(req.query);
    await RedisCache.set(cacheKey, result, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, result, 'Pcategories fetched successfully'));
});

export const getPcategoryById = catchAsync(async (req, res) => {
    const cacheKey = `${SINGLE_PREFIX}${req.params.id}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'Pcategory details fetched successfully (cached)'));

    const pcategory = await pcategoryService.getById(req.params.id);
    await RedisCache.set(cacheKey, pcategory, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, pcategory, 'Pcategory details fetched successfully'));
});

export const updatePcategory = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;
    const pcategory = await pcategoryService.update(req.params.id, req.body);

    // Invalidate list and single caches
    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, pcategory, 'Pcategory updated successfully'));
});

export const deletePcategory = catchAsync(async (req, res) => {
    await pcategoryService.remove(req.params.id);

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, null, 'Pcategory deleted successfully'));
});

export const togglePcategory = catchAsync(async (req, res) => {
    const pcategory = await pcategoryService.toggle(req.params.id);

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, { isActive: pcategory.isActive }, `Pcategory is now ${pcategory.isActive ? 'active' : 'inactive'}`));
});
