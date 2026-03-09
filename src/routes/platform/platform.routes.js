import { Router } from 'express';
import { getPublicModules, getHome } from '../../controllers/platform/home.controller.js';

const router = Router();

// Public: platform modules list
router.get('/modules', getPublicModules);

// Public: dynamic home screen per module (slug ya moduleId dono chalega)
router.get('/home/:identifier', getHome);

export default router;
