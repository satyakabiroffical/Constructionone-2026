/**
 * Written by Pradeep
 */
import * as categoryService from "../../services/category.service.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import RedisCache from "../../utils/redisCache.js";

const CACHE_PREFIX = "categories:";
const SINGLE_PREFIX = "category:";
const CACHE_TTL = 300; // 5 minutes

export const createCategory = catchAsync(async (req, res) => {
  if (req.file) req.body.image = req.file.location;
  const category = await categoryService.create(req.body, req.user._id);

  await RedisCache.delete(CACHE_PREFIX);

  res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

export const getAllCategories = catchAsync(async (req, res) => {
  const cacheKey = `${CACHE_PREFIX}${JSON.stringify(req.query)}`;
  const cached = await RedisCache.get(cacheKey);
  if (cached)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cached,
          "Categories fetched successfully (cached)",
        ),
      );

  const result = await categoryService.getAll(req.query);
  await RedisCache.set(cacheKey, result, CACHE_TTL);

  res
    .status(200)
    .json(new ApiResponse(200, result, "Categories fetched successfully"));
});

export const getCategoryById = catchAsync(async (req, res) => {
  const cacheKey = `${SINGLE_PREFIX}${req.params.id}`;
  const cached = await RedisCache.get(cacheKey);
  if (cached)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cached,
          "Category details fetched successfully (cached)",
        ),
      );

  const category = await categoryService.getById(req.params.id);
  await RedisCache.set(cacheKey, category, CACHE_TTL);

  res
    .status(200)
    .json(
      new ApiResponse(200, category, "Category details fetched successfully"),
    );
});

export const updateCategory = catchAsync(async (req, res) => {
  if (req.file) req.body.image = req.file.location;
  const category = await categoryService.update(req.params.id, req.body);

  await Promise.all([
    RedisCache.delete(CACHE_PREFIX),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

export const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.remove(req.params.id);

  await Promise.all([
    RedisCache.delete(CACHE_PREFIX),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export const toggleCategory = catchAsync(async (req, res) => {
  const category = await categoryService.toggle(req.params.id);

  await Promise.all([
    RedisCache.delete(CACHE_PREFIX),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isActive: category.isActive },
        `Category is now ${category.isActive ? "active" : "inactive"}`,
      ),
    );
});
