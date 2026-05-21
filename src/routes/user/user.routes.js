/**
 * Written by Pradeep
 */
import express from "express";
import {
  getAllUsers,
  getUser,
  deleteUser,
  getMe,
  updateMe,
  saveFcmToken,
  toggleUserStatus,
} from "../../controllers/user/user.controller.js";
import { s3Uploader } from "../../middlewares/uploads.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { exportUsers } from "../../controllers/marketPlace/exportDataInFiles.controller.js";

const router = express.Router();
router.get("/me", requireAuth, getMe);
router.put(
  "/me",
  requireAuth,
  s3Uploader().fields([{ name: "profileImage", maxCount: 1 }]),
  updateMe,
);
router.post("/saveFcmToken", requireAuth, saveFcmToken);

// Admin routes — must be authenticated AND have ADMIN role
router.get("/", requireAuth, requireRole("ADMIN"), getAllUsers);
router.get("/export", requireAuth, requireRole("ADMIN"), exportUsers);

router.get("/:id", requireAuth, requireRole("ADMIN"), getUser);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteUser);
router.patch(
  "/:id/toggle",
  requireAuth,
  requireRole("ADMIN", "SUB_ADMIN"),
  toggleUserStatus,
);

export default router;
