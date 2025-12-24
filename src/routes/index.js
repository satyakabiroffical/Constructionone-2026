// src/routes/index.js
<<<<<<< HEAD
import { Router } from 'express';
import exampleRoutes from './example.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import pcategoryRoutes from './pcategory.routes.js';
import blogRoutes from './blog.routes.js';
=======

import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import productRoutes from "./product.routes.js";
import companyRoutes from "./company.routes.js";
import fAQRoutes from "./fAQ.routes.js";
import homeBannerRoutes from "./homeBanner.routes.js";
>>>>>>> b8380ebbcfa2c6a697c988f4b8998494a6f2b3b3

const router = Router();

// Mount routes
<<<<<<< HEAD
router.use('/v1', exampleRoutes);
router.use('/v1', productRoutes);
router.use('/v1', categoryRoutes);
router.use('/v1', pcategoryRoutes);
router.use('/v1', blogRoutes);

=======
>>>>>>> b8380ebbcfa2c6a697c988f4b8998494a6f2b3b3

router.use("/v1", exampleRoutes);
router.use("/v1", productRoutes);
router.use("/v1", companyRoutes);
router.use("/v1", fAQRoutes);
router.use("/v1", homeBannerRoutes);

export default router;
