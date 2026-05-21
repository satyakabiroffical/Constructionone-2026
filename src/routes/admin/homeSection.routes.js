import { Router } from "express";
import {
  createHomeSection,
  getAllHomeSections,
  getHomeSectionById,
  updateHomeSection,
  deleteHomeSection,
  toggleHomeSection,
  addProductsToHomeSection,
  removeProductFromSection,
} from "../../controllers/admin/homeSection.controller.js";

const router = Router();

// Admin routes — all protected by gateway in admin/index.js (requireAuth + ADMIN)
router.post("/", createHomeSection);
router.get("/", getAllHomeSections);
router.get("/:id", getHomeSectionById);
router.put("/:id", updateHomeSection);
router.delete("/:id", deleteHomeSection);
router.patch("/:id/toggle", toggleHomeSection);
router.put("/:sectionId/products", addProductsToHomeSection);
router.delete(
  "/:sectionId/products/:productId",
  removeProductFromSection,
);
export default router;
