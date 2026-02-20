import PlatformModule from '../../models/platform/module.model.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// Public API to get active modules for home screen
export const getPublicModules = catchAsync(async (req, res, next) => {
    const modules = await PlatformModule.find({
        isActive: true,
        isVisible: true,
    })
        .sort({ order: 1 })
        .select('title image icon slug type routePath');

    return res.status(200).json(
        new ApiResponse(200, modules, 'Active platform modules fetched successfully')
    );
});
