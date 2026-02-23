import { Router } from 'express';
import { getPublicModules } from '../../controllers/platform/home.controller.js';

const router = Router();

// Public route to get platform modules
router.get('/modules', getPublicModules);

export default router;
