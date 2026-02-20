import { Router } from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    toggleCategory,
} from '../../controllers/admin/category.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { s3Uploader } from '../../middlewares/uploads.js';

const router = Router();

// Protect all routes
router.use(requireAuth, requireRole('ADMIN'));

router
    .route('/')
    .post(s3Uploader().single('image'), createCategory)
    .get(getAllCategories);

router
    .route('/:id')
    .get(getCategoryById)
    .put(s3Uploader().single('image'), updateCategory)
    .delete(deleteCategory);

router.patch('/:id/toggle', toggleCategory);

export default router;
