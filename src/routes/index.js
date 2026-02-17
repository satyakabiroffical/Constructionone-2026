import { Router } from "express";

// Import Module Gateways
import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import marketplaceRoutes from "./marketplace/index.js";
import rentalRoutes from "./rental/index.js";
import serviceProviderRoutes from "./serviceProvider/index.js";
import vendorRoutes from "./vendor/index.js";
import adminRoutes from "./admin/index.js";

const router = Router();

// global route gateway
// Mount all modules under /v1 (modules themselves handle their specific prefixes like /auth, /users)
router.use("/v1", authRoutes);
router.use("/v1", userRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);
router.use("/v1", vendorRoutes);
router.use("/v1", adminRoutes);

export default router;
