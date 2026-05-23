import { Router } from "express";
import * as trendingController from "../../controllers/admin/trendingSection.controller.js";

const router = Router();

// Routes are grouped under /admin/trending-sections
// and are protected globally in src/routes/admin/index.js

router
  .route("/")
  .get(trendingController.getSections)
  .post(trendingController.createSection);

router.post(
  "/:sectionId/products",
  trendingController.addProductsToTrendingSection,
);

router.delete(
  "/:sectionId/:productId",
  trendingController.deleteAddedSingleProduct,
);

router
  .route("/:id")
  .get(trendingController.getTrendingSectionById)
  .put(trendingController.updateSection)
  .delete(trendingController.deleteSection);

router.patch("/:id/toggle", trendingController.toggleSectionStatus);

export default router;
