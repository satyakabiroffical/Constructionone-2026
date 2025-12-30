import { Router } from "express";
import {
  authController,
  verifyOtp,
  updateProfile,
  getProfile,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

router.route("/registerLoginUser").post(authController);
router.route("/verifyOtp").post(verifyOtp);
router
  .route("/profile")
  .get(authMiddleware, getProfile)
  .put(authMiddleware, updateProfile);

export default router;
