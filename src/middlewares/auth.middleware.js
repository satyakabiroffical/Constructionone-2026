/**
 * Written by Pradeep
 */
import jwt from "jsonwebtoken";
import User from "../models/user/user.model.js";
import { APIError } from "./errorHandler.js";

export const requireAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new APIError(401, "Not authenticated"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new APIError(401, "The user belonging to this token no longer exists."),
      );
    }
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new APIError(401, "Invalid or expired token"));
  }
};
