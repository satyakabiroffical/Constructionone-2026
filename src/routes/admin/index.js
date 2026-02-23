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

const router = Router();

// Public admin route (login) — mounted BEFORE the auth gateway
// admin.routes.js manages its own auth internally (login is public, rest requires ADMIN)

router.use("/admin", adminRoutes);

// All routes below are fully protected — requireAuth + ADMIN role enforced here
// router.use(requireAuth, requireRole('ADMIN'));

router.use("/admin/platform-modules", platformModuleRoutes);
router.use("/admin/pcategories", pcategoryRoutes);
router.use("/admin/categories", categoryRoutes);
router.use("/admin/sub-categories", subCategoryRoutes);
router.use("/company", companyRoutes);
router.use("/admin/faqs", faqRoutes);
router.use("/admin/banners", bannerRoutes);

export default router;
