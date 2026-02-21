import * as subCategoryService from '../../services/subCategory.service.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

const CACHE_PREFIX = 'subcategories:';
const SINGLE_PREFIX = 'subcategory:';
const CACHE_TTL = 300; // 5 minutes

export const createSubCategory = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;
    const subCategory = await subCategoryService.create(req.body, req.user._id);

    await RedisCache.delete(CACHE_PREFIX);

    res.status(201).json(new ApiResponse(201, subCategory, 'SubCategory created successfully'));
});

export const getAllSubCategories = catchAsync(async (req, res) => {
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'SubCategories fetched successfully (cached)'));

    const result = await subCategoryService.getAll(req.query);
    await RedisCache.set(cacheKey, result, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, result, 'SubCategories fetched successfully'));
});

export const getSubCategoryById = catchAsync(async (req, res) => {
    const cacheKey = `${SINGLE_PREFIX}${req.params.id}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, 'SubCategory details fetched successfully (cached)'));

    const subCategory = await subCategoryService.getById(req.params.id);
    await RedisCache.set(cacheKey, subCategory, CACHE_TTL);

    res.status(200).json(new ApiResponse(200, subCategory, 'SubCategory details fetched successfully'));
});

export const updateSubCategory = catchAsync(async (req, res) => {
    if (req.file) req.body.image = req.file.location;
    const subCategory = await subCategoryService.update(req.params.id, req.body);

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, subCategory, 'SubCategory updated successfully'));
});

export const deleteSubCategory = catchAsync(async (req, res) => {
    await subCategoryService.remove(req.params.id);

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, null, 'SubCategory deleted successfully'));
});

export const toggleSubCategory = catchAsync(async (req, res) => {
    const subCategory = await subCategoryService.toggle(req.params.id);

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    ]);

    res.status(200).json(new ApiResponse(200, { isActive: subCategory.isActive }, `SubCategory is now ${subCategory.isActive ? 'active' : 'inactive'}`));
});
