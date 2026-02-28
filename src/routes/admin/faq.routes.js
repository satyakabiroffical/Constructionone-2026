import { Router } from 'express';
import {
    createFaq,
    getAllFaqs,
    getFaqById,
    updateFaq,
    deleteFaq
} from '../../controllers/admin/faq.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Apply auth and role check for all routes
// router.use(requireAuth);
// router.use(requireRole('ADMIN')); // Assuming only ADMIN can manage FAQs here

router.post('/', requireAuth, requireRole('ADMIN'), createFaq);
router.get('/', getAllFaqs);
router.get('/:faqId', getFaqById);
router.put('/:faqId', requireAuth, requireRole('ADMIN'), updateFaq);
router.delete('/:faqId', requireAuth, requireRole('ADMIN'), deleteFaq);

export default router;
