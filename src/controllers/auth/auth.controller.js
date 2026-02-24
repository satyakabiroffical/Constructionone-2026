/**
 * Written by Pradeep
 */
import User from '../../models/user/user.model.js';
import jwt from 'jsonwebtoken';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import {
    registerSchema,
    loginSchema,
    loginPhoneSchema,
    verifyOtpSchema,
    verifyResetOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
} from '../../validations/auth/auth.validation.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { generateOtp, sendOtpViaMSG91 } from '../../utils/otpUtils.js';

// Register User
export const register = catchAsync(async (req, res, next) => {
    const { error } = registerSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
        return next(new APIError(400, 'Email or Phone already exists'));
    }

    const newUser = await User.create(req.body);

    const accessToken = newUser.generateAccessToken();
    const refreshToken = newUser.generateRefreshToken();

    newUser.refreshToken = refreshToken;
    await newUser.save({ validateBeforeSave: false });

    res.status(201).json(
        new ApiResponse(201, {
            accessToken,
            refreshToken,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role,
            }
        }, "User registered successfully")
    );
});

// Login with Email/Password
export const login = catchAsync(async (req, res, next) => {
    const { error } = loginSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new APIError(401, 'Invalid email or password'));
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            }
        }, "User logged in successfully")
    );
});

// Login with Phone (Generate OTP)
export const loginPhone = catchAsync(async (req, res, next) => {
    const { error } = loginPhoneSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { phone } = req.body;
    let user = await User.findOne({ phone }).select(
        '+otp +otpExpiry +otpAttempts'
    );

    if (!user) {
        return next(new APIError(404, 'User not found with this phone number'));
    }

    // Check attempts
    if (user.otpAttempts >= 20) {
        if (user.otpExpiry && user.otpExpiry < Date.now()) {
            user.otpAttempts = 0;
        } else {
            return next(
                new APIError(429, 'Too many OTP attempts. Please try again later.')
            );
        }
    }

    // ─── DEV MODE: static OTP ────────────────────────────────────────────────────
    // TODO (PRODUCTION): Uncomment the real block below and delete the static otp line.
    //
    // const otp = generateOtp();
    // user.otp = String(otp);
    // user.otpExpiry = Date.now() + 5 * 60 * 1000;
    // user.otpAttempts += 1;
    // await user.save({ validateBeforeSave: false });
    // try {
    //     await sendOtpViaMSG91(phone, otp);
    //     console.log(`[MSG91] OTP sent to ${phone}`);
    // } catch (error) {
    //     console.error(`[MSG91] Failed to send OTP to ${phone}:`, error.message);
    //     // return next(new APIError(500, 'Failed to send OTP')); // uncomment in production
    // }
    // ─────────────────────────────────────────────────────────────────────────────
    const otp = '1234'; // DEV ONLY — static OTP. Replace with generateOtp() in production.
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    console.log(`[DEV MODE] Static OTP for ${phone}: ${otp}`);

    res.status(200).json(
        new ApiResponse(200, { otp }, "OTP sent successfully")
    );
});

// Verify OTP
export const verifyOtp = catchAsync(async (req, res, next) => {
    const { error } = verifyOtpSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { phone, otp } = req.body;

    const user = await User.findOne({ phone }).select(
        '+otp +otpExpiry +otpAttempts'
    );
    if (!user) return next(new APIError(404, 'User not found'));

    if (user.otp !== otp) {
        return next(new APIError(400, 'Invalid OTP'));
    }

    if (user.otpExpiry < Date.now()) {
        return next(new APIError(400, 'OTP has expired'));
    }

    // Success
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            }
        }, "User logged in successfully")
    );
});

// Forgot Password
export const forgotPassword = catchAsync(async (req, res, next) => {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new APIError(404, 'User not found'));

    // ─── DEV MODE: static OTP ────────────────────────────────────────────────────
    // TODO (PRODUCTION): Uncomment the real block below and delete the static otp line.
    //
    // const otp = Math.floor(1000 + Math.random() * 9000).toString();
    // user.otp = otp;
    // user.otpExpiry = Date.now() + 5 * 60 * 1000;
    // await user.save({ validateBeforeSave: false });
    // // TODO: integrate email OTP service here (e.g. Nodemailer / SendGrid)
    // ─────────────────────────────────────────────────────────────────────────────
    const otp = '1234'; // DEV ONLY — static OTP. Replace with Math.random() in production.
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins
    await user.save({ validateBeforeSave: false });
    console.log(`[DEV MODE] Static Forgot Password OTP for ${email}: ${otp}`);

    res.status(200).json(
        new ApiResponse(200, { otp }, "OTP sent to email")
    );
});

// Verify Reset OTP & Get Token
export const verifyResetOtp = catchAsync(async (req, res, next) => {
    const { error } = verifyResetOtpSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) return next(new APIError(404, 'User not found'));

    if (user.otp !== otp) {
        return next(new APIError(400, 'Invalid OTP'));
    }

    if (user.otpExpiry < Date.now()) {
        return next(new APIError(400, 'OTP has expired'));
    }

    // Verify successful, clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate specific reset token (short lived: 10 mins)
    const resetToken = jwt.sign(
        { id: user._id, type: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    res.status(200).json(
        new ApiResponse(200, { resetToken }, "OTP verified. Proceed to reset password.")
    );
});

// Reset Password (Using Token)
export const resetPassword = catchAsync(async (req, res, next) => {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { newPassword } = req.body;
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new APIError(401, 'Please provide Reset Token'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'reset') {
            return next(new APIError(401, 'Invalid token type'));
        }

        const user = await User.findById(decoded.id).select('+password');
        if (!user) return next(new APIError(404, 'User not found'));

        user.password = newPassword;
        await user.save();

        res.status(200).json(
            new ApiResponse(200, null, "Password reset successfully")
        );
    } catch (error) {
        return next(new APIError(400, 'Invalid or expired reset token'));
    }
});

// Change Password (Authenticated)
export const changePassword = catchAsync(async (req, res, next) => {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.correctPassword(oldPassword, user.password))) {
        return next(new APIError(401, 'Incorrect old password'));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json(
        new ApiResponse(200, null, "Password updated successfully")
    );
});

// Logout
export const logout = catchAsync(async (req, res) => {
    if (req.user) {
        // Clear refresh token from DB
        await User.findByIdAndUpdate(req.user.id, {
            $unset: { refreshToken: 1 }
        });
    }

    res.status(200).json(
        new ApiResponse(200, null, "Logged out successfully")
    );
});

// Refresh Access Token
export const refreshAccessToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new APIError(401, 'Refresh token is required'));
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user) {
            return next(new APIError(401, 'Invalid refresh token'));
        }

        if (user.refreshToken !== refreshToken) {
            return next(new APIError(401, 'Refresh token is expired or used'));
        }

        const accessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(200).json(
            new ApiResponse(200, {
                accessToken,
                refreshToken: newRefreshToken
            }, "Access token refreshed")
        );

    } catch (error) {
        return next(new APIError(401, 'Invalid refresh token'));
    }
});
