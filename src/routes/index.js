// src/routes/index.js
<<<<<<< HEAD
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import productRoutes from "./product.routes.js";
import companyRoutes from "./company.routes.js";
import fAQRoutes from "./fAQ.routes.js";
=======
import { Router } from 'express';
import exampleRoutes from './example.routes.js';
import productRoutes from './product.routes.js';
>>>>>>> 45f6de973d55d6f78cd8118e15f52d507d2b5ae0

const router = Router();

// Mount routes
<<<<<<< HEAD
router.use("/v1", exampleRoutes);
router.use("/v1", productRoutes);
router.use("/v1", companyRoutes);
router.use("/v1", fAQRoutes);

export default router;
=======
router.use('/v1', exampleRoutes);
router.use('/v1', productRoutes)

export default router;
>>>>>>> 45f6de973d55d6f78cd8118e15f52d507d2b5ae0
