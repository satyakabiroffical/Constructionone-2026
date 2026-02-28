import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    createFlashSale,
    cancelFlashSale,
    getAllFlashSales,
    getFlashSaleById,
    getFlashSaleItems,
} from '../../controllers/admin/flashSale.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.post('/', createFlashSale);
router.get('/', getAllFlashSales);
router.get('/:id', getFlashSaleById);
router.get('/:id/items', getFlashSaleItems);
router.put('/:id/cancel', cancelFlashSale);

export default router;
