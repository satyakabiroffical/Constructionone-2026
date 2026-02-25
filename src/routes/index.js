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
import countryRoutes from "./admin/country.routes.js";
import statRoutes from "./admin/state.routes.js";
import cityRoutes from "./admin/city.routes.js";
import pincodeRoutes from "./admin/pincode.routes.js";
import rfqRoutes from "./vendorShop/rfq.routes.js";

const router = Router();

router.use("/v1", authRoutes);
router.use("/v1", marketplaceRoutes);
router.use("/v1", rentalRoutes);
router.use("/v1", serviceProviderRoutes);

//Public routes MUST be mounted BEFORE adminRoutes
//adminRoutes has a global requireAuth gate that catches all /v1/* requests

router.use("/v1/banners", publicBannerRoutes);
router.use("/v1", adminRoutes);
router.use("/v1", notificationRoutes);
router.use("/v1", userRoutes);

// Vendor / Material shop routes
router.use("/v1", vendorRoutes);
router.use("/v1", countryRoutes); //Sanvi
router.use("/v1", statRoutes); //Sanvi
router.use("/v1", cityRoutes); //Sanvi
router.use("/v1", pincodeRoutes); //Sanvi
router.use("/v1", rfqRoutes); //Sanvi
router.use("/v1/material", brandRoutes); //Sanvi
router.use("/v1/material", productRoutes); //Sanvi
router.use("/v1/material", variantRoutes); // Sanvi

export default router;
