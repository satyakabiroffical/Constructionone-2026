import express from "express";
import {
  notifyOnlyAllUsers,
  notifyOnlyAllVendors,
  notifyAllVendorsAndUsers,
  getVendorNotifications,
  getUserNotifications,
  notifySingleUser,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { vendorMiddleware } from "../middlewares/auth.js";
const router = express.Router();

router.post(
  "/notification/send",
  requireAuth,
  requireRole("ADMIN"),
  notifySingleUser,
);
router.post(
  "/notification/users",
  requireAuth,
  requireRole("ADMIN"),
  notifyOnlyAllUsers,
);
router.post(
  "/notification/vendors",
  requireAuth,
  requireRole("ADMIN"),
  notifyOnlyAllVendors,
);
router.post(
  "/notification/all",
  requireAuth,
  requireRole("ADMIN"),
  notifyAllVendorsAndUsers,
);

router.patch("/notification/:id", requireAuth, markNotificationRead);
router.get("/user-notifications", requireAuth, getUserNotifications);
router.get("/vendor-notifications", vendorMiddleware, getVendorNotifications);

export default router;
