//Pradeep
import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdminMe,
  updateAdmin,
  logoutAdmin,
  getAllAdmins,
  getAdminById,
  createSubAdmin,
  getAllSubAdmin,
  getSubAdminMe,
  toggleSubAdmin,
  logoutSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  updateSubAdminProfile,
} from "../../controllers/admin/admin.controller.js";
import { getAdminDashboardData } from "../../controllers/admin/adminDashboard.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/role.middleware.js";
import { s3Uploader } from "../../middlewares/uploads.js";

const router = Router();

// Public
router.post("/login", loginAdmin);

// Protected Admin Routes (Requires Auth + Role=ADMIN)
// router.use(requireAuth); // All routes below this require authentication
// Protected (requireAuth sets req.user, requireRole checks role)
router.use(requireAuth);

router.get(
  "/dashboard",
  requireAuth,
  requirePermission("DASHBOARD"),
  getAdminDashboardData,
);

// Auth management
router.post("/register", registerAdmin);
router.post("/logout", requireRole("ADMIN"), logoutAdmin);

// Own profile
router.get("/me", requireRole("ADMIN"), getAdminMe); // ← NEW: GET own profile
router.put(
  "/me",
  requireRole("ADMIN"),
  s3Uploader().fields([{ name: "profileImage", maxCount: 1 }]),
  updateAdmin,
); // existing: UPDATE own profile

//sub-admin creation
router.post("/sub-admin", requireAuth, requireRole("ADMIN"), createSubAdmin);
router.put("/sub-admin/:id", requireAuth, requireRole("ADMIN"), updateSubAdmin);
router.put(
  "/sub-admin/profile/:id",
  requireAuth,
  requireRole("SUB_ADMIN"),
  updateSubAdminProfile,
);
router.delete(
  "/sub-admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  deleteSubAdmin,
);
router.get("/sub-admin", requireAuth, requireRole("ADMIN"), getAllSubAdmin);
router.get(
  "/sub-admin/me",
  requireAuth,
  requireRole("SUB_ADMIN"),
  getSubAdminMe,
);
router.post("/sub-admin/logout", requireAuth, logoutSubAdmin);
router.get(
  "/sub-admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  getSubAdminById,
);
router.patch(
  "/sub-admin/toggle/:id",
  requireAuth,
  requireRole("ADMIN"),
  toggleSubAdmin,
);

// Admin user management
router.get("/users", requireRole("ADMIN"), getAllAdmins);
router.get("/users/:id", requireRole("ADMIN"), getAdminById);

//permission
import { getAllPermissions } from "../../controllers/admin/admin.controller.js";
router.get(
  "/permissions",
  requireAuth,
  requireRole("ADMIN"),
  getAllPermissions,
);

export default router;
