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
} from "../../controllers/user/user.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = express.Router();
router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.post("/saveFcmToken", requireAuth, saveFcmToken);


// Admin routes — must be authenticated AND have ADMIN role
router.get("/", requireAuth, requireRole("ADMIN"), getAllUsers);
router.get("/:id", requireAuth, requireRole("ADMIN"), getUser);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteUser);

export default router;
