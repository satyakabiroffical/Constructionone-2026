// src/routes/index.js
import { Router } from 'express';
import exampleRoutes from './example.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import pcategoryRoutes from './pcategory.routes.js';
import blogRoutes from './blog.routes.js';

const router = Router();

// Mount routes
router.use('/v1', exampleRoutes);
router.use('/v1', productRoutes);
router.use('/v1', categoryRoutes);
router.use('/v1', pcategoryRoutes);
router.use('/v1', blogRoutes);


export default router;