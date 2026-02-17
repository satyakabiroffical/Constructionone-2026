/**
 * Written by Pradeep
 */
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login requests per window
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 OTP requests per window
    message: 'Too many OTP requests from this IP, please try again after an hour',
});
