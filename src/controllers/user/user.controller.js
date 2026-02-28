/**
 * Written by Pradeep
 */
import User from '../../models/user/user.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import RedisCache from '../../utils/redisCache.js';

// Cache key helpers
const userCacheKey = (userId) => `user:profile:${userId}`;
const allUsersCacheKey = (query) => `users:all:${JSON.stringify(query)}`;


// Get all users (Admin) — Redis cached + optimized query
export const getAllUsers = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Step 1: Cache check
    const cacheKey = allUsersCacheKey({ page, limit, role: req.query.role });
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(
            new ApiResponse(200, cached.users, 'Users fetched successfully', cached.meta)
        );
    }

    // Step 2: Filter banao
    // FIX: Pehle aggregation pipeline use hoti thi — heavy aur slow
    // Ab simple find() + countDocuments() — indexes use karta hai directly (fast!)
    const filter = { role: req.query.role || 'USER' };

    // Dono queries parallel mein chalao (Promise.all)
    const [users, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-password -otp -otpExpiry -otpType -otpAttempts -refreshToken -__v')
            .lean(),
        User.countDocuments(filter),
    ]);

    const meta = { total, page, limit, totalPages: Math.ceil(total / limit) };

    // Step 3: Cache karo (60 sec)
    await RedisCache.set(cacheKey, { users, meta }, 60);

    res.status(200).json(
        new ApiResponse(200, users, 'Users fetched successfully', meta)
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

// Delete user (Admin) — cache invalidate karo delete ke baad
export const deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new APIError(404, 'User not found'));

    // 2 caches invalidate karo:
    // 1. Us specific user ki profile cache
    // 2. Saari paginated users:all list caches (pattern delete)
    await Promise.all([
        RedisCache.delete(userCacheKey(req.params.id)),
        RedisCache.deletePattern('users:all:'),
    ]);

    res.status(200).json(
        new ApiResponse(200, null, 'User deleted successfully')
    );
});

// Get Me (User) — Redis cached
export const getMe = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const cacheKey = userCacheKey(userId);

    // Step 1: Check Redis cache first (fast path)
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
        return res.status(200).json(
            new ApiResponse(200, { user: cached }, 'User fetched successfully')
        );
    }

    // Step 2: Cache miss — fetch from DB
    const user = await User.findById(userId).lean();
    if (!user) return next(new APIError(404, 'User not found'));

    // Step 3: Store in Redis for 5 minutes (300 seconds)
    await RedisCache.set(cacheKey, user, 300);

    res.status(200).json(
        new ApiResponse(200, { user }, 'User fetched successfully')
    );
});


// Update Me (User) — cache invalidate karo update ke baad
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
    }).lean();

    // Cache invalidate — purana data delete karo, next getMe fresh fetch karega
    await RedisCache.delete(userCacheKey(req.user.id));

    res.status(200).json(
        new ApiResponse(200, { user: updatedUser }, 'Profile updated successfully')
    );
});


// Save FCM Token (User) — cache invalidate karo (profile update hua hai)
export const saveFcmToken = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
        return next(new APIError(400, 'FCM token is required'));
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    // Cache invalidate — fcmToken change hua toh cached profile bhi stale ho gaya
    await RedisCache.delete(userCacheKey(userId));

    res.status(200).json(
        new ApiResponse(200, null, 'FCM token saved successfully')
    );
});


