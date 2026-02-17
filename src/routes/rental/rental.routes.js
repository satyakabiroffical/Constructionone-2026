import { Router } from 'express';

const router = Router();

// Placeholder route
router.get('/', (req, res) => {
    res.json({ message: 'Rental routes working' });
});

export default router;
