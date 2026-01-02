import { adminLogin, adminSignup ,toggleUserStatus} from "../controllers/admin.controller.js";
import { Router } from "express";

const router = Router();
router.route("/admin/signup").post(adminSignup);
router.route("/admin/login").post(adminLogin);
router.route("/admin/userstatutoggle/:userId").patch(toggleUserStatus);

export default router;