// src/routes/admin/flashSale.routes.js
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    createFlashSale,
    activateFlashSale,
    expireFlashSale,
    cancelFlashSale,
    getAllFlashSales,
    getFlashSaleById,
    getFlashSaleItems,
} from '../../controllers/admin/flashSale.controller.js';

const router = Router();

// All admin flash sale routes require authentication + ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

router.post('/', createFlashSale);     // Create flash sale with items
router.get('/', getAllFlashSales);     // List all (filterable)
router.get('/:id', getFlashSaleById);    // Get single flash sale
router.get('/:id/items', getFlashSaleItems);   // Get variants in a flash sale
router.put('/:id/activate', activateFlashSale);   // UPCOMING → ACTIVE
router.put('/:id/expire', expireFlashSale);     // ACTIVE   → COMPLETED
router.put('/:id/cancel', cancelFlashSale);     // Any      → CANCELLED

export default router;
