// Written by Pradeep
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";


import adminRoutes from "./admin.routes.js";
import companyRoutes from "./company.routes.js";
import faqRoutes from "./faq.routes.js";
import platformModuleRoutes from "./platformModule.routes.js";
import pcategoryRoutes from "./pcategory.routes.js";
import categoryRoutes from "./category.routes.js";
import subCategoryRoutes from "./subCategory.routes.js";
import bannerRoutes from "./banner.routes.js";
import homeSectionRoutes from "./homeSection.routes.js";
import flashSaleRoutes from "./flashSale.routes.js";
import taxRoutes from "./tax.routes.js";
import adminOrderRoutes from "./order.routes.js";
import globalSearchRoutes from "./globalSearch.routes.js";
import adminReviewRoutes from "./review.routes.js";

const router = Router();

// Public admin route (login) — managed internally in admin.routes.js
// All routes below are fully protected — requireAuth + ADMIN role enforced here
// router.use(requireAuth, requireRole('ADMIN'));

router.use("/admin", adminRoutes);
router.use("/admin", requireAuth, requireRole("ADMIN"));
router.use("/admin/platform-modules", platformModuleRoutes);
router.use("/admin/pcategories", pcategoryRoutes);
router.use("/admin/categories", categoryRoutes);
router.use("/admin/sub-categories", subCategoryRoutes);
router.use("/company", companyRoutes);
router.use("/admin/faqs", faqRoutes);
router.use("/admin/banners", bannerRoutes);
router.use("/admin/home-sections", homeSectionRoutes);
router.use("/admin/flash-sales", flashSaleRoutes);
router.use("/tax", taxRoutes);
router.use("/admin/order", adminOrderRoutes);
router.use("/user", globalSearchRoutes);
router.use("/admin/reviews", adminReviewRoutes);

export default router;
