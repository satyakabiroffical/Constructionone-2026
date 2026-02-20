import { Router } from 'express';
import {
    createPlatformModule,
    getAllPlatformModules,
    getPlatformModule,
    updatePlatformModule,
    deletePlatformModule,
    toggleModuleActive,
    toggleModuleVisibility,
} from '../../controllers/admin/platformModule.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js'; // Ensure correct path for role middleware

import { s3Uploader } from '../../middlewares/uploads.js';

const router = Router();

// Protect all routes
router.use(requireAuth, requireRole('ADMIN'));

const uploadFields = s3Uploader().fields([
    { name: 'image', maxCount: 1 },
    { name: 'icon', maxCount: 1 }
]);

router
    .route('/')
    .post(uploadFields, createPlatformModule)
    .get(getAllPlatformModules);

router
    .route('/:id')
    .get(getPlatformModule)
    .put(uploadFields, updatePlatformModule)
    .delete(deletePlatformModule);

router.patch('/:id/toggle', toggleModuleActive);
router.patch('/:id/visibility', toggleModuleVisibility);

export default router;
