import { Router } from "express";
import { authController, verifyOtp } from "../controllers/auth.controller.js";

const router = Router();

router.route("/registerLoginUser").post(authController);
router.route("/verifyOtp").post(verifyOtp);

export default router;
