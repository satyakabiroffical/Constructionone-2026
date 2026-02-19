import { Router } from 'express';
import {
    createSubCategory,
    getSubCategories,
    getSubCategoryById,
    updateSubCategory,
    toggleSubCategory,
    deleteSubCategory,
} from '../../controllers/admin/subCategory.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { categoryUpload, processCategoryUpload } from '../../middlewares/uploads.js';

const router = Router();

// All routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// Sub Category Routes
router.post('/sub-categories', categoryUpload, processCategoryUpload, createSubCategory);
router.get('/sub-categories', getSubCategories);
router.get('/sub-categories/:id', getSubCategoryById);
router.put('/sub-categories/:id', categoryUpload, processCategoryUpload, updateSubCategory);
router.patch('/sub-categories/:id/toggle', toggleSubCategory);
router.delete('/sub-categories/:id', deleteSubCategory);

export default router;
