/**
 * Written by Pradeep
 */
import express from 'express';
import {
    register,
    login,
    loginPhone,
    verifyOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    changePassword,
    logout,
    refreshAccessToken,
} from '../../controllers/auth/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import {
    authLimiter,
    otpLimiter,
} from '../../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/login-phone', otpLimiter, loginPhone);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-reset-otp', otpLimiter, verifyResetOtp);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes
router.put('/change-password', requireAuth, changePassword);
router.post('/logout', requireAuth, logout);
router.post('/refresh-token', refreshAccessToken);

export default router;
