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

    // FIX: Sirf 3 fields fetch karo — poora document nahi
    // Pehle: full User doc (.lean() bhi nahi tha) = heavy memory + slow
    const currentUser = await User.findById(decoded.id)
      .select("_id role isDisabled")
      .lean();

    if (!currentUser) {
      return next(
        new APIError(401, "The user belonging to this token no longer exists."),
      );
    }

    if (currentUser.isDisabled) {
      return next(new APIError(403, "Your account has been disabled."));
    }

    // Sirf zaruri info req.user mein rakho
    req.user = { id: decoded.id, role: currentUser.role };
    next();
  } catch (error) {
    return next(new APIError(401, "Invalid or expired token"));
  }
};
