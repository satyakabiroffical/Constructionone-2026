import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import companyRoutes from './company.routes.js';
import faqRoutes from './faq.routes.js';
import mainCategoryRoutes from './mainCategory.routes.js';
import categoryRoutes from './category.routes.js';
import subCategoryRoutes from './subCategory.routes.js';
import taxRoutes from './tax.routes.js';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/company', companyRoutes);
router.use('/faq', faqRoutes);
router.use('/admin', mainCategoryRoutes);
router.use('/admin', categoryRoutes);
router.use('/admin', subCategoryRoutes);
router.use('/tax', taxRoutes);

export default router;

