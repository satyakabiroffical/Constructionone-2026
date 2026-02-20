import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import companyRoutes from './company.routes.js';
import faqRoutes from './faq.routes.js';
import platformModuleRoutes from './platformModule.routes.js';
import pcategoryRoutes from './pcategory.routes.js';
import categoryRoutes from './category.routes.js';
import subCategoryRoutes from './subCategory.routes.js';

const router = Router();

router.use('/admin/platform-modules', platformModuleRoutes);
router.use('/admin/pcategories', pcategoryRoutes);
router.use('/admin/categories', categoryRoutes);
router.use('/admin/sub-categories', subCategoryRoutes);

router.use('/admin', adminRoutes);
router.use('/company', companyRoutes);
router.use('/faq', faqRoutes);

export default router;


