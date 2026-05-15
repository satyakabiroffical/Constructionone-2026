import { Router } from "express";
import {
  createPcategory,
  getAllPcategories,
  getPcategoryById,
  updatePcategory,
  deletePcategory,
  togglePcategory,
} from "../../controllers/admin/pcategory.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/role.middleware.js";
import { s3Uploader } from "../../middlewares/uploads.js";
const router = Router();

// Protect all routes
// router.use(requireAuth, requireRole('ADMIN'));

router
  .route("/")
  .post(
    requirePermission("MARKETPLACE_CATEGORIES"),
    s3Uploader().single("image"),
    createPcategory,
  )
  .get(getAllPcategories);

router
  .route("/:id")
  .get(requirePermission("MARKETPLACE_CATEGORIES"), getPcategoryById)
  .put(
    requirePermission("MARKETPLACE_CATEGORIES"),
    s3Uploader().single("image"),
    updatePcategory,
  )
  .delete(requirePermission("MARKETPLACE_CATEGORIES"), deletePcategory);

router.patch("/:id/toggle", togglePcategory);

export default router;
