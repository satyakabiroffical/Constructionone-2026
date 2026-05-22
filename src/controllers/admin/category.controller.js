/**
 * Written by Pradeep
 */
import * as categoryService from "../../services/category.service.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import RedisCache from "../../utils/redisCache.js";
import { createActivityLog } from "./activityLog.controller.js";

const CACHE_PREFIX = "categories:";
const SINGLE_PREFIX = "category:";
const CACHE_TTL = 300; // 5 minutes

export const createCategory = catchAsync(async (req, res) => {
  if (req.file) req.body.image = req.file.location;

  const category = await categoryService.create(req.body, req.user.id);

  await createActivityLog({
    req,
    action: "CREATE",
    module: "CATEGORY",
    targetId: category._id,
    details: {
      name: category.name,
      isActive: category.isActive,
    },
  });

  await RedisCache.deletePattern(CACHE_PREFIX + "*");
  await RedisCache.deletePattern("home:*");

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

  // ✅ Activity Log
  await createActivityLog({
    req,
    action: "UPDATE",
    module: "CATEGORY",
    targetId: category._id,
    details: {
      updatedFields: Object.keys(req.body),
    },
  });

  await Promise.all([
    RedisCache.deletePattern(CACHE_PREFIX + "*"),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    RedisCache.deletePattern("home:*"),
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

export const deleteCategory = catchAsync(async (req, res) => {
  // make sure remove() returns deleted category
  const category = await categoryService.remove(req.params.id);

  // ✅ Activity Log
  await createActivityLog({
    req,
    action: "DELETE",
    module: "CATEGORY",
    targetId: req.params.id,
    details: {
      name: category?.name,
    },
  });

  await Promise.all([
    RedisCache.deletePattern(CACHE_PREFIX + "*"),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    RedisCache.deletePattern("home:*"),
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export const toggleCategory = catchAsync(async (req, res) => {
  const category = await categoryService.toggle(req.params.id);

  // ✅ Activity Log
  await createActivityLog({
    req,
    action: "TOGGLE_STATUS",
    module: "CATEGORY",
    targetId: category._id,
    details: {
      newStatus: category.isActive,
    },
  });

  await Promise.all([
    RedisCache.deletePattern(CACHE_PREFIX + "*"),
    RedisCache.delete(`${SINGLE_PREFIX}${req.params.id}`),
    RedisCache.deletePattern("home:*"),
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

//asgr
export const getByPcategoryId = catchAsync(async (req, res) => {
  const { pcategoryId } = req.params;
  const cacheKey = `${CACHE_PREFIX}pcategory:${pcategoryId}:${JSON.stringify(req.query)}`;
  const cached = await RedisCache.get(cacheKey);
  if (cached) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cached,
          "Categories fetched successfully (cached)",
        ),
      );
  }
  const result = await categoryService.getByPcategoryId(pcategoryId, req.query);
  await RedisCache.set(cacheKey, result, CACHE_TTL);
  res
    .status(200)
    .json(new ApiResponse(200, result, "Categories fetched successfully"));
});
