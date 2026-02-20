import { Router } from "express";

import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import marketplaceRoutes from "./marketplace/index.js";
import rentalRoutes from "./rental/index.js";
import serviceProviderRoutes from "./serviceProvider/index.js";
import adminRoutes from "./admin/index.js";
import notificationRoutes from "./notification.routes.js";
import brandRoutes from "./vendorShop/brand.routes.js";
import productRoutes from "./vendorShop/product.routes.js";
import variantRoutes from "./vendorShop/variant.routes.js";

const router = Router();

router.use("/v1", authRoutes);
router.use("/v1", userRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);
router.use("/v1", adminRoutes);
router.use("/v1", notificationRoutes);

// Vendor / Material shop routes
router.use("/v1/vendor", brandRoutes);
router.use("/v1/vendor", productRoutes);
router.use("/v1/vendor", variantRoutes);

export default router;
