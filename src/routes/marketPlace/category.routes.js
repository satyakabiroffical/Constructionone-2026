import { Router } from "express";
import {
  getCategoryTree,
  getCategoryTreeForAdmin,
  getAllCategories,getsubCategoriesByCategoryId
} from "../../controllers/marketPlace/category.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = Router();

router.get("/", requireAuth, getAllCategories);
router.get("/subcategories/:id", requireAuth, getsubCategoriesByCategoryId);
router.get("/categories", getCategoryTree);
router.get("/categories/admin", getCategoryTreeForAdmin);
export default router;
