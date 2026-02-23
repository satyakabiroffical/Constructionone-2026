// Written by Pradeep
import { Router } from 'express';
import {
    createBanner,
    getAllBanners,
    getBannerById,
    updateBanner,
    deleteBanner,
    toggleBanner,
} from '../../controllers/admin/banner.controller.js';
import { s3Uploader } from '../../middlewares/uploads.js';

const router = Router();

// Auth applied at admin/index.js gateway — no per-route auth needed here

router
    .route('/')
    .post(s3Uploader().single('image'), createBanner)
    .get(getAllBanners);

router
    .route('/:id')
    .get(getBannerById)
    .put(s3Uploader().single('image'), updateBanner)
    .delete(deleteBanner);

router.patch('/:id/toggle', toggleBanner);

export default router;
