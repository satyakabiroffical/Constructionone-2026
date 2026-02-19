import { Router } from 'express';
import categoryRoutes from './category.routes.js';

const router = Router();

// Mount marketplace routes under /marketplace prefix
router.use('/marketplace', categoryRoutes);

export default router;

