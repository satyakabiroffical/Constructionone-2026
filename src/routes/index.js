// src/routes/index.js
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import notificationRoutes from "./notification.routes.js";
import brandRoutes from "./vendorShop/brand.routes.js";
import productRoutes from "./vendorShop/product.routes.js";
import variantRoutes from "./vendorShop/variant.routes.js";

const router = Router();

// Mount routes

router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);

router.use("/v1/material", brandRoutes);
router.use("/v1/material", productRoutes);
router.use("/v1/material", variantRoutes);

export default router;
