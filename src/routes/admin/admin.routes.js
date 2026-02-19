import { Router } from 'express';
import {
    registerAdmin,
    loginAdmin,
    updateAdmin,
    logoutAdmin
} from '../../controllers/admin/admin.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = Router();

// Public Admin Routes
router.post('/login', loginAdmin);

// Protected Admin Routes (Requires Auth + Role=ADMIN)
router.use(requireAuth); // All routes below this require authentication

router.post('/register', requireRole('ADMIN'), registerAdmin); // Creating new admin requires existing admin
router.put('/me', requireRole('ADMIN'), updateAdmin);
router.post('/logout', requireRole('ADMIN'), logoutAdmin);

export default router;
