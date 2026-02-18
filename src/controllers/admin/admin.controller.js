/**
 * Written by Pradeep
 */
import User from '../../models/user/user.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { registerSchema, loginSchema } from '../../validations/auth/auth.validation.js'; // Reusing auth schemas for now, or define specific admin ones if different

// Register New Admin (Protected: Only an existing ADMIN can create another ADMIN)
export const registerAdmin = catchAsync(async (req, res, next) => {
    // Validate Input
    const { error } = registerSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email, phone, firstName, lastName, password, address, gender, dob } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
        return next(new APIError(400, 'Email or Phone already exists'));
    }

    // Create Admin User
    const newAdmin = await User.create({
        firstName,
        lastName,
        email,
        phone,
        password,
        address,
        gender,
        dob,
        role: 'ADMIN', // Explicitly set role
        isVerified: true, // Auto-verify admins created by other admins
        permissions: ['*']
    });

    const accessToken = newAdmin.generateAccessToken();
    const refreshToken = newAdmin.generateRefreshToken();

    newAdmin.refreshToken = refreshToken;
    await newAdmin.save({ validateBeforeSave: false });

    res.status(201).json(
        new ApiResponse(201, {
            admin: {
                id: newAdmin._id,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName,
                email: newAdmin.email,
                role: newAdmin.role
            }
        }, "Admin created successfully")
    );
});

// Admin Login
export const loginAdmin = catchAsync(async (req, res, next) => {
    const { error } = loginSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email, password } = req.body;

    // Find user and explicitly check for ADMIN role
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new APIError(401, 'Invalid email or password'));
    }

    if (user.role !== 'ADMIN') {
        return next(new APIError(403, 'Access denied. Admin only.'));
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {
            accessToken,
            refreshToken,
            admin: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            }
        }, "Admin logged in successfully")
    );
});

// Update Admin Profile (Self)
export const updateAdmin = catchAsync(async (req, res, next) => {
    const { firstName, lastName, phone, address, gender, dob } = req.body;

    // Basic update logic
    const updatedAdmin = await User.findByIdAndUpdate(
        req.user.id,
        { firstName, lastName, phone, address, gender, dob },
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, {
            admin: {
                id: updatedAdmin._id,
                firstName: updatedAdmin.firstName,
                lastName: updatedAdmin.lastName,
                email: updatedAdmin.email,
                role: updatedAdmin.role
            }
        }, "Admin profile updated successfully")
    );
});

// Logout Admin
export const logoutAdmin = catchAsync(async (req, res) => {
    if (req.user) {
        await User.findByIdAndUpdate(req.user.id, {
            $unset: { refreshToken: 1 }
        });
    }

    res.status(200).json(
        new ApiResponse(200, null, "Admin logged out successfully")
    );
});
