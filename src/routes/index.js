// src/routes/index.js

import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import productRoutes from "./product.routes.js";
import companyRoutes from "./company.routes.js";
import authRoutes from "./auth.routes.js";
import fAQRoutes from "./fAQ.routes.js";
import homeBannerRoutes from "./homeBanner.routes.js";
import categoryRoutes from "./category.routes.js";
import pcategoryRoutes from "./pcategory.routes.js";
import blogRoutes from "./blog.routes.js";
import wishlist from "./wishlist.routes.js";

const router = Router();

// Mount routes

router.use("/v1", exampleRoutes);
router.use("/v1", productRoutes);
router.use("/v1", companyRoutes);
router.use("/v1", fAQRoutes);
router.use("/v1", homeBannerRoutes);
router.use("/v1", authRoutes);
router.use("/v1", wishlist);

export default router;
