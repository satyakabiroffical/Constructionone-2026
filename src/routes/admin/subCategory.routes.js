import { Router } from 'express';
import {
    createSubCategory,
    getAllSubCategories,
    getSubCategoryById,
    updateSubCategory,
    deleteSubCategory,
    toggleSubCategory,
} from '../../controllers/admin/subCategory.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { s3Uploader } from '../../middlewares/uploads.js';

const router = Router();

// Protect all routes
router.use(requireAuth, requireRole('ADMIN'));

router
    .route('/')
    .post(s3Uploader().single('image'), createSubCategory)
    .get(getAllSubCategories);

router
    .route('/:id')
    .get(getSubCategoryById)
    .put(s3Uploader().single('image'), updateSubCategory)
    .delete(deleteSubCategory);

router.patch('/:id/toggle', toggleSubCategory);

export default router;
