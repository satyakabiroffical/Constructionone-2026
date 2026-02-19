import { validationResult } from 'express-validator';
import { APIError } from './errorHandler.js';

/**
 * Middleware to validate request data against schema
 */
export const validateRequest = (validations) => {

  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

    // Throw validation error
    next(new APIError(400, 'Validation failed', true, {
      errors: extractedErrors
    }));
  };
};

/**
 * Validates MongoDB ObjectId
 */
export const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new APIError(400, 'Invalid ID format', true);
  }
  return true;
};

/**
 * Sanitize input data to prevent NoSQL injection
 */
export const sanitize = (data) => {
  if (!data) return data;

  if (typeof data === 'string') {
    // Remove potentially malicious characters
    return data.replace(/[${}()\[\]\";'<>]/g, '');
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitize(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

export default {
  validateRequest,
  validateObjectId,
  sanitize
};
