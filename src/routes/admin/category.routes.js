import { Router } from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    toggleCategory,
    deleteCategory,
} from '../../controllers/admin/category.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { categoryUpload, processCategoryUpload } from '../../middlewares/uploads.js';

const router = Router();

// All routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// Category Routes
router.post('/categories', categoryUpload, processCategoryUpload, createCategory);
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', categoryUpload, processCategoryUpload, updateCategory);
router.patch('/categories/:id/toggle', toggleCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
