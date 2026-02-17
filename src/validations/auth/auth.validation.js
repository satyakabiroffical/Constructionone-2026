/**
 * Written by Pradeep
 */
import Joi from 'joi';

export const registerSchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
    }),
    address: Joi.string().allow('', null),
    gender: Joi.string().valid('Male', 'Female', 'Other').allow('', null),
    dob: Joi.date().allow('', null),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const loginPhoneSchema = Joi.object({
    phone: Joi.string().required(),
});

export const verifyOtpSchema = Joi.object({
    phone: Joi.string().required(),
    otp: Joi.string().length(4).required(),
});

export const verifyResetOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(4).required(),
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Passwords do not match',
    }),
});

export const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
});
