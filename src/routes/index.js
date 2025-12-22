// src/routes/index.js
import { Router } from 'express';
import exampleRoutes from './example.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

// Mount routes
router.use('/v1', exampleRoutes);
router.use('/v1', productRoutes)

export default router;