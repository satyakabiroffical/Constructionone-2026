// src/routes/platform/flashSale.routes.js
import { Router } from 'express';
import {
    getActiveFlashSales,
    getFlashSalePublicItems,
    getVariantPrice,
} from '../../controllers/platform/flashSale.controller.js';

const router = Router();

// All public — no authentication required
router.get('/flash-sales/active', getActiveFlashSales);      // Active sales (filter by moduleId)
router.get('/flash-sales/:id/items', getFlashSalePublicItems);  // Items in a flash sale
router.get('/pricing/variant/:variantId', getVariantPrice);          // Resolve price for any variant

export default router;
