// src/routes/index.js
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import productRoutes from "./product.routes.js";
import companyRoutes from "./company.routes.js";
import fAQRoutes from "./fAQ.routes.js";

const router = Router();

// Mount routes
router.use("/v1", exampleRoutes);
router.use("/v1", productRoutes);
router.use("/v1", companyRoutes);
router.use("/v1", fAQRoutes);

export default router;
