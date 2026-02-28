import { Router } from 'express';
import serviceProviderRoutes from './serviceprovider.routes.js';

const router = Router();

router.use('/service-providers', serviceProviderRoutes);

export default router;
