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
} from "../../controllers/admin/admin.controller.js";
// import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/login", loginAdmin);

// ─── Protected (all routes below require auth) ────────────────────────────────
// router.use(requireAuth);
// Protected Admin Routes (Requires Auth + Role=ADMIN)
// router.use(requireAuth); // All routes below this require authentication

// Auth management
router.post("/register", registerAdmin);
router.post("/logout", requireRole("ADMIN"), logoutAdmin);

// Own profile
router.get("/me", requireRole("ADMIN"), getAdminMe); // ← NEW: GET own profile
router.put("/me", requireRole("ADMIN"), updateAdmin); // existing: UPDATE own profile

// Admin user management
router.get("/users", requireRole("ADMIN"), getAllAdmins);
router.get("/users/:id", requireRole("ADMIN"), getAdminById);

export default router;
