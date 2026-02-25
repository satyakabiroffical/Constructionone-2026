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
} from "../../controllers/user/user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = express.Router();
router.get("/me", getMe);
router.put("/me", updateMe);

// Admin routes — must be authenticated AND have ADMIN role
router.get("/", requireAuth, requireRole("ADMIN"), getAllUsers);
router.get("/:id", requireAuth, requireRole("ADMIN"), getUser);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteUser);

export default router;
