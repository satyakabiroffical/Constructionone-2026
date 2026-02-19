import { Router } from 'express';
import {
    createMainCategory,
    getMainCategories,
    getMainCategoryById,
    updateMainCategory,
    toggleMainCategory,
    deleteMainCategory,
} from '../../controllers/admin/mainCategory.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { categoryUpload, processCategoryUpload } from '../../middlewares/uploads.js';

const router = Router();

// All routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// Main Category Routes
router.post('/main-categories', categoryUpload, processCategoryUpload, createMainCategory);
router.get('/main-categories', getMainCategories);
router.get('/main-categories/:id', getMainCategoryById);
router.put('/main-categories/:id', categoryUpload, processCategoryUpload, updateMainCategory);
router.patch('/main-categories/:id/toggle', toggleMainCategory);
router.delete('/main-categories/:id', deleteMainCategory);

export default router;
