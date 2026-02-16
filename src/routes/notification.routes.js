import express from "express";
import {
  notifySingleUser,
  notifyAllUsers,
  getUserNotifications,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
const router = express.Router();

router.post(
  "/notification/send",
  authMiddleware,
  adminMiddleware,
  notifySingleUser,
);
router.post(
  "/notification/send-all",
  authMiddleware,
  adminMiddleware,
  notifyAllUsers,
);

router.patch("/notification/:id", authMiddleware, markNotificationRead);
router.get("/user-notifications", authMiddleware, getUserNotifications);

export default router;
