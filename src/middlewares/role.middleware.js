/**
 * Written by Pradeep
 */
import { APIError } from "./errorHandler.js";

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new APIError(403, "You do not have permission to perform this action"),
      );
    }
    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    // Admin has all permissions
    if (req.user.role === "ADMIN") {
      return next();
    }
    if (!req.user || !req.user.permissions.includes(permission)) {
      return next(
        new APIError(403, "You do not have permission to perform this action"),
      );
    }
    next();
  };
};
