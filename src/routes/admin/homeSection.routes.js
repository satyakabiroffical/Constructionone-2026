import { Router } from 'express';
import {
    createHomeSection,
    getAllHomeSections,
    getHomeSectionById,
    updateHomeSection,
    deleteHomeSection,
    toggleHomeSection,
} from '../../controllers/admin/homeSection.controller.js';

const router = Router();

// Admin routes — all protected by gateway in admin/index.js (requireAuth + ADMIN)
router.post('/', createHomeSection);
router.get('/', getAllHomeSections);
router.get('/:id', getHomeSectionById);
router.put('/:id', updateHomeSection);
router.delete('/:id', deleteHomeSection);
router.patch('/:id/toggle', toggleHomeSection);

export default router;
