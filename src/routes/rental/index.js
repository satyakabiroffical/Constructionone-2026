import { Router } from 'express';
import rentalRoutes from './rental.routes.js';

const router = Router();

router.use('/rentals', rentalRoutes);

export default router;
