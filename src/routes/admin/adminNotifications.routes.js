import Router from "express";
import {
  getAdminNotifications,
  markAllNotificationsAsRead,
} from "../../controllers/admin/adminNotification.controller.js";
import { authMiddleware, adminMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/", adminMiddleware, getAdminNotifications);
router.put("/mark-read", adminMiddleware, markAllNotificationsAsRead);

export default router;
