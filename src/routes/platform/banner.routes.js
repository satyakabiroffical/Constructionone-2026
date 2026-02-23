// Written by Pradeep
import { Router } from 'express';
import { getPublicBanners } from '../../controllers/platform/banner.controller.js';

const router = Router();

/**
 * GET /api/v1/banners?moduleId=xxx&page=HOME&position=TOP
 *
 * Public — no auth required
 * Returns only active + currently scheduled banners
 * Sorted by order ASC
 */
router.get('/', getPublicBanners);

export default router;
