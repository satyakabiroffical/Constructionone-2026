// Written by Pradeep
import PlatformModule from '../../models/platform/module.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

const CACHE_PREFIX = 'platform-modules:';
const CACHE_SINGLE = 'platform-module:';
const CACHE_TTL = 300; // 5 minutes

export const createPlatformModule = catchAsync(async (req, res, next) => {
    const { title, type, routePath, order } = req.body;

    let image = req.body.image;
    let icon = req.body.icon;

    if (req.files) {
        if (req.files.image?.[0]) image = req.files.image[0].location;
        if (req.files.icon?.[0]) icon = req.files.icon[0].location;
    }

    if (!image) return next(new APIError(400, 'Image is required'));

    const existingModule = await PlatformModule.findOne({ title }).lean();
    if (existingModule) return next(new APIError(400, 'Module with this title already exists'));

    const module = await PlatformModule.create({
        title, image, icon,
        type: type?.toUpperCase(),
        routePath, order,
        createdBy: req.user._id,
    });

    // Invalidate list cache
    await RedisCache.delete(CACHE_PREFIX);

    return res.status(201).json(
        new ApiResponse(201, module, 'Platform module created successfully')
    );
});

export const getAllPlatformModules = catchAsync(async (req, res) => {
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(
            new ApiResponse(200, cached, 'Platform modules fetched successfully (cached)')
        );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, type, sort, isActive } = req.query;

    const matchStage = {};
    if (search) matchStage.title = { $regex: search, $options: 'i' };
    if (type) matchStage.type = type.toUpperCase();
    if (isActive === 'true') matchStage.isActive = true;
    if (isActive === 'false') matchStage.isActive = false;

    const sortStage = {};
    if (sort) {
        const [field, dir] = sort.split(':');
        sortStage[field] = dir === 'desc' ? -1 : 1;
    } else {
        sortStage.order = 1;
        sortStage.createdAt = -1;
    }

    const result = await PlatformModule.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        { $project: { __v: 0 } },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ]);

    const data = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    const payload = {
        modules: data,
        pagination: { page, limit, totalPages: Math.ceil(total / limit), total },
    };

    await RedisCache.set(cacheKey, payload, CACHE_TTL);

    return res.status(200).json(
        new ApiResponse(200, payload, 'Platform modules fetched successfully')
    );
});

export const getPlatformModule = catchAsync(async (req, res, next) => {
    const cacheKey = `${CACHE_SINGLE}${req.params.id}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(
            new ApiResponse(200, cached, 'Platform module details fetched successfully (cached)')
        );
    }

    const module = await PlatformModule.findById(req.params.id).lean();
    if (!module) return next(new APIError(404, 'Platform module not found'));

    await RedisCache.set(cacheKey, module, CACHE_TTL);

    return res.status(200).json(
        new ApiResponse(200, module, 'Platform module details fetched successfully')
    );
});

export const updatePlatformModule = catchAsync(async (req, res, next) => {
    const updates = req.body;
    if (updates.type) updates.type = updates.type.toUpperCase();

    if (req.files) {
        if (req.files.image?.[0]) updates.image = req.files.image[0].location;
        if (req.files.icon?.[0]) updates.icon = req.files.icon[0].location;
    }

    const module = await PlatformModule.findByIdAndUpdate(req.params.id, updates, {
        new: true, runValidators: true,
    });

    if (!module) return next(new APIError(404, 'Platform module not found'));

    // Invalidate caches
    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    return res.status(200).json(
        new ApiResponse(200, module, 'Platform module updated successfully')
    );
});

export const deletePlatformModule = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findByIdAndDelete(req.params.id);
    if (!module) return next(new APIError(404, 'Platform module not found'));

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    return res.status(200).json(
        new ApiResponse(200, null, 'Platform module deleted successfully')
    );
});

export const toggleModuleActive = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findByIdAndUpdate(
        req.params.id,
        [{ $set: { isActive: { $not: '$isActive' } } }],
        { new: true }
    );
    if (!module) return next(new APIError(404, 'Platform module not found'));

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { isActive: module.isActive }, `Module is now ${module.isActive ? 'active' : 'inactive'}`)
    );
});

export const toggleModuleVisibility = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findByIdAndUpdate(
        req.params.id,
        [{ $set: { isVisible: { $not: '$isVisible' } } }],
        { new: true }
    );
    if (!module) return next(new APIError(404, 'Platform module not found'));

    await Promise.all([
        RedisCache.delete(CACHE_PREFIX),
        RedisCache.delete(`${CACHE_SINGLE}${req.params.id}`),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { isVisible: module.isVisible }, `Module is now ${module.isVisible ? 'visible' : 'hidden'}`)
    );
});
