import { adminLogin, adminSignup } from "../controllers/admin.controller.js";
import { Router } from "express";
import authMiddleware from "../middleware/auth.js";

const router = Router();
router.route("/admin/signup").post(adminSignup);
router.route("/admin/login").post(adminLogin);

export default router;