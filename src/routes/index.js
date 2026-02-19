import { Router } from "express";

// Import Module Gateways
import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import marketplaceRoutes from "./marketplace/index.js";
import reviewRoutes from "./user/review.routes.js";
import rentalRoutes from "./rental/index.js";
import serviceProviderRoutes from "./serviceProvider/index.js";
// import vendorRoutes from "./vendor/index.js"; // TODO: Create vendor routes
import adminRoutes from "./admin/index.js";
import exampleRoutes from "./example.routes.js";
import notificationRoutes from "./notification.routes.js";
import brandRoutes from "./vendorShop/brand.routes.js";
import productRoutes from "./vendorShop/product.routes.js";
import variantRoutes from "./vendorShop/variant.routes.js";

const router = Router();

// global route gateway
// Mount all modules under /v1 (modules themselves handle their specific prefixes like /auth, /users)
router.use("/v1", authRoutes);
router.use("/v1", userRoutes);
router.use("/v1", reviewRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);
// router.use("/v1", vendorRoutes); // TODO: Uncomment when vendor routes are created
router.use("/v1", adminRoutes);
router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);

router.use("/v1/material", brandRoutes);
router.use("/v1/material", productRoutes);
router.use("/v1/material", variantRoutes);

export default router;
