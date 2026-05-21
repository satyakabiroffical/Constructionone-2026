import exprees from "express";
import {
  createActivityLog,
  getAllActivityLogs,
} from "../../controllers/admin/activityLog.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = exprees.Router();
// router.use(requireAuth);

// Only ADMIN can access activity logs
router.get("/", requireRole("ADMIN"), getAllActivityLogs);
router.post("/", requireRole("SUB_ADMIN","ADMIN"), createActivityLog);

export default router;
