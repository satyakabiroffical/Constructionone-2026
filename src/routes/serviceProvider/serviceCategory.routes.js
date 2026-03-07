import { Router } from "express";
import {
  getAllServiceCategories,
  createServiceCategory,
  getSingleServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  toggleServiceCategoryStatus,
  getActiveServiceCategories,
} from "../../controllers/serviceProvider/serviceCategory.controller.js";
import { adminMiddleware, authMiddleware } from "../../middlewares/auth.js";

const router = Router();
router.post("/", adminMiddleware, createServiceCategory);
router.get("/all", adminMiddleware, getAllServiceCategories); //admin get all
router.get("/", authMiddleware, getActiveServiceCategories); //users
router.get("/:id", adminMiddleware, getSingleServiceCategory);
router.put("/:id", adminMiddleware, updateServiceCategory);
router.delete("/:id", adminMiddleware, deleteServiceCategory);
// Placeholder route
router.patch(
  "/:id/toggle-status",
  adminMiddleware,
  toggleServiceCategoryStatus,
);
export default router;
