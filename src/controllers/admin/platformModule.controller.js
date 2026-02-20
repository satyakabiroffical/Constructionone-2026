import PlatformModule from '../../models/platform/module.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// Create a new module
export const createPlatformModule = catchAsync(async (req, res, next) => {
    const { title, type, routePath, order } = req.body;

    // Handle file uploads
    let image = req.body.image;
    let icon = req.body.icon;

    if (req.files) {
        if (req.files.image && req.files.image[0]) {
            image = req.files.image[0].location; // S3 location
        }
        if (req.files.icon && req.files.icon[0]) {
            icon = req.files.icon[0].location; // S3 location
        }
    }

    if (!image) {
        return next(new APIError(400, 'Image is required'));
    }

    const existingModule = await PlatformModule.findOne({ title });
    if (existingModule) {
        return next(new APIError(400, 'Module with this title already exists'));
    }

    const module = await PlatformModule.create({
        title,
        image,
        type: type?.toUpperCase(),
        routePath,
        order,
        icon,
        createdBy: req.user._id,
    });

    return res.status(201).json(
        new ApiResponse(201, module, 'Platform module created successfully')
    );
});

// Get all modules (Pagination, Search, Filter, Sort)
export const getAllPlatformModules = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, type, sort, isActive } = req.query;

    const matchStage = {};

    if (search) {
        matchStage.title = { $regex: search, $options: 'i' };
    }

    if (type) {
        matchStage.type = type.toUpperCase();
    }

    if (isActive === 'true') matchStage.isActive = true;
    if (isActive === 'false') matchStage.isActive = false;

    const sortStage = {};
    if (sort) {
        // e.g. sort=order:asc or sort=createdAt:desc
        const [field, order] = sort.split(':');
        sortStage[field] = order === 'desc' ? -1 : 1;
    } else {
        sortStage.order = 1; // Default sort by order
        sortStage.createdAt = -1;
    }

    const pipeline = [
        { $match: matchStage },
        { $sort: sortStage },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ];

    const result = await PlatformModule.aggregate(pipeline);
    const data = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                modules: data,
                pagination: {
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    totalModules: total,
                },
            },
            'Platform modules fetched successfully'
        )
    );
});

// Get single module
export const getPlatformModule = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findById(req.params.id);

    if (!module) {
        return next(new APIError(404, 'Platform module not found'));
    }

    return res.status(200).json(
        new ApiResponse(200, module, 'Platform module details fetched successfully')
    );
});

// Update module
export const updatePlatformModule = catchAsync(async (req, res, next) => {
    const updates = req.body;
    if (updates.type) updates.type = updates.type.toUpperCase();

    // Handle file uploads for updates
    if (req.files) {
        if (req.files.image && req.files.image[0]) {
            updates.image = req.files.image[0].location;
        }
        if (req.files.icon && req.files.icon[0]) {
            updates.icon = req.files.icon[0].location;
        }
    }

    const module = await PlatformModule.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
    });

    if (!module) {
        return next(new APIError(404, 'Platform module not found'));
    }

    return res.status(200).json(
        new ApiResponse(200, module, 'Platform module updated successfully')
    );
});

// Delete module
export const deletePlatformModule = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findByIdAndDelete(req.params.id);

    if (!module) {
        return next(new APIError(404, 'Platform module not found'));
    }

    return res.status(200).json(
        new ApiResponse(200, null, 'Platform module deleted successfully')
    );
});

// Toggle Active
export const toggleModuleActive = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findById(req.params.id);
    if (!module) {
        return next(new APIError(404, 'Platform module not found'));
    }

    module.isActive = !module.isActive;
    await module.save();

    return res.status(200).json(
        new ApiResponse(200, { isActive: module.isActive }, `Module is now ${module.isActive ? 'active' : 'inactive'}`)
    );
});

// Toggle Visibility
export const toggleModuleVisibility = catchAsync(async (req, res, next) => {
    const module = await PlatformModule.findById(req.params.id);
    if (!module) {
        return next(new APIError(404, 'Platform module not found'));
    }

    module.isVisible = !module.isVisible;
    await module.save();

    return res.status(200).json(
        new ApiResponse(200, { isVisible: module.isVisible }, `Module is now ${module.isVisible ? 'visible' : 'hidden'}`)
    );
});
