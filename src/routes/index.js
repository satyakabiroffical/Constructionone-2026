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

const router = Router();

router.use("/v1", authRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);

//  Public routes MUST be mounted BEFORE adminRoutes
// adminRoutes has a global requireAuth gate that catches all /v1/* requests
router.use("/v1/banners", publicBannerRoutes);

router.use("/v1", adminRoutes);
router.use("/v1", notificationRoutes);
router.use("/v1", userRoutes);
router.use("/v1", vendorRoutes);

// Vendor / Material shop routes
router.use("/v1/material", brandRoutes);
router.use("/v1/material", productRoutes);
router.use("/v1/material", variantRoutes);

export default router;
