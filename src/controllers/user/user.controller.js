/**
 * Written by Pradeep
 */
import User from '../../models/user/user.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// Get all users (Admin)
// Get all users (Admin)
// Get all users (Admin)
export const getAllUsers = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
        {
            $match: {
                role: 'USER', // Only fetch standard users
                ...req.query.role && { role: req.query.role } // Allow override if needed via ?role=ADMIN
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ];

    const result = await User.aggregate(pipeline);

    const users = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.status(200).json(
        new ApiResponse(200, users, "Users fetched successfully", {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        })
    );
});

// Get single user (Admin)
export const getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new APIError(404, 'User not found'));

    res.status(200).json(
        new ApiResponse(200, { user }, "User fetched successfully")
    );
});

// Delete user (Admin)
export const deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new APIError(404, 'User not found'));

    res.status(200).json(
        new ApiResponse(200, null, "User deleted successfully")
    );
});

// Get Me (User)
export const getMe = catchAsync(async (req, res, next) => {
    // req.user is attached by auth middleware
    const user = await User.findById(req.user.id);
    res.status(200).json(
        new ApiResponse(200, { user }, "User fetched successfully")
    );
});

// Update Me (User)
export const updateMe = catchAsync(async (req, res, next) => {
    // Prevent password update via this route
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new APIError(
                400,
                'This route is not for password updates. Please use /change-password'
            )
        );
    }

    // Filter allowed fields
    const allowedFields = [
        'firstName',
        'lastName',
        'name',
        'address',
        'gender',
        'dob',
        'email',
    ];
    const updates = {};
    Object.keys(req.body).forEach((key) => {
        if (allowedFields.includes(key)) {
            updates[key] = req.body[key];
        }
    });

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
        new: true,
        runValidators: true,
    });

    res.status(200).json(
        new ApiResponse(200, { user: updatedUser }, "Profile updated successfully")
    );
});
