import { Router } from 'express';
import vendorRoutes from './vendor.routes.js';

const router = Router();

router.use('/vendors', vendorRoutes);

export default router;
