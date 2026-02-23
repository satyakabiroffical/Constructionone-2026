import { Router } from 'express';
import { getPublicModules, getHome } from '../../controllers/platform/home.controller.js';

const router = Router();

// Public: platform modules list
router.get('/modules', getPublicModules);

// Public: dynamic home screen per module
router.get('/home/:moduleSlug', getHome);

export default router;
