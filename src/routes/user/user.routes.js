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
// Protect all routes
router.use(requireAuth);
// User routes (Me)
router.get("/me", getMe);
router.put("/me", updateMe);

// Admin routes
router.get("/", requireRole("ADMIN"), getAllUsers);
router.get("/:id", requireRole("ADMIN"), getUser);
router.delete("/:id", requireRole("ADMIN"), deleteUser);

export default router;
