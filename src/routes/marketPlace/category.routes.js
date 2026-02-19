import { Router } from 'express';
import { getCategoryTree } from '../../controllers/marketplace/category.controller.js';

const router = Router();

// Public category tree endpoint
router.get('/categories', getCategoryTree);

export default router;

