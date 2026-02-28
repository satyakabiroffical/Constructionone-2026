import { Router } from "express";
import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import marketplaceRoutes from "./marketplace/index.js";
import rentalRoutes from "./rental/index.js";
import serviceProviderRoutes from "./serviceProvider/index.js";
import vendorRoutes from "./vendorShop/index.js";
import adminRoutes from "./admin/index.js";
import notificationRoutes from "./notification.routes.js";
import brandRoutes from "./vendorShop/brand.routes.js";
import productRoutes from "./vendorShop/product.routes.js";
import variantRoutes from "./vendorShop/variant.routes.js";
import publicBannerRoutes from "./platform/banner.routes.js";
import platformRoutes from "./platform/platform.routes.js";
import faqRoutes from "./admin/faq.routes.js";
import countryRoutes from "./admin/country.routes.js";
import statRoutes from "./admin/state.routes.js";
import cityRoutes from "./admin/city.routes.js";
import pincodeRoutes from "./admin/pincode.routes.js";
import flashSalePublicRoutes from "./platform/flashSale.routes.js";
import rfqRoutes from "./vendorShop/rfq.routes.js";

const router = Router();

router.use("/v1", authRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);

// ─── PUBLIC routes — MUST be before adminRoutes ───────────────────────────────
// adminRoutes has global requireAuth that intercepts ALL /v1/* if mounted first
router.use("/v1/banners", publicBannerRoutes);
router.use("/v1/platform", platformRoutes);   // ← /platform/home/:slug, /platform/modules
router.use("/v1/faqs", faqRoutes);
router.use("/v1", flashSalePublicRoutes);     // public: flash sales + pricing resolution

router.use("/v1", adminRoutes);
router.use("/v1", notificationRoutes);
router.use("/v1", userRoutes);

router.use("/v1", vendorRoutes);
// Vendor / Material shop routes
router.use("/v1", countryRoutes);
router.use("/v1", statRoutes);
router.use("/v1", cityRoutes);
router.use("/v1", pincodeRoutes);
router.use("/v1", rfqRoutes);
router.use("/v1/material", brandRoutes);
router.use("/v1/material", productRoutes);
router.use("/v1/material", variantRoutes);

export default router;
