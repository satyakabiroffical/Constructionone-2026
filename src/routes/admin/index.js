import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import companyRoutes from './company.routes.js';
import faqRoutes from './faq.routes.js';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/company', companyRoutes);
router.use('/faq', faqRoutes);

export default router;
