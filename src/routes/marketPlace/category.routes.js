import { Router } from 'express';
import { getCategoryTree } from '../../controllers/marketPlace/category.controller.js';

const router = Router();

router.get('/categories', getCategoryTree);

export default router;

