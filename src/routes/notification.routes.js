import express from "express";
import {
  notifySingleUser,
  notifyAllUsers,
  getUserNotifications,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/notification/send",
  requireAuth,
  requireRole("ADMIN"),
  notifySingleUser,
);
router.post(
  "/notification/send-all",
  requireAuth,
  requireRole("ADMIN"),
  notifyAllUsers,
);

router.patch("/notification/:id", requireAuth, markNotificationRead);
router.get("/user-notifications", requireAuth, getUserNotifications);

export default router;
