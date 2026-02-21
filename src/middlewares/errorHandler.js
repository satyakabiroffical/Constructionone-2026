// src/middleware/errorHandler.js
import logger from "../utils/logger.js";

// Custom error class with additional context
export class APIError extends Error {
  constructor(statusCode, message, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Static methods for common errors
  static badRequest(message = "Bad Request", details = null) {
    return new APIError(400, message, true, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new APIError(401, message);
  }

  static notFound(message = "Resource not found") {
    return new APIError(404, message);
  }

  static internal(message = "Internal Server Error", details = null) {
    return new APIError(500, message, false, details);
  }
}

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  // Default error response
  const errorResponse = {
    success: false,
    status: err.status || "error",
    message: err.message || "Something went wrong",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // Add error details in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.error = {
      name: err.name,
      stack: err.stack,
      details: err.details,
    };
  }

  // Log the error (uncomment if needed)
  // logger.error({
  //   ...errorResponse,
  //   user: req.user?.id || 'anonymous'
  // });

  // Send response
  res.status(err.statusCode || 500).json(errorResponse);
};

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  next(APIError.notFound(`Can't find ${req.originalUrl} on this server!`));
};

// Async error handler wrapper
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  APIError,
  errorHandler,
  notFoundHandler,
  catchAsync,
};
