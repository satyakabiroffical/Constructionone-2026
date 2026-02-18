import { Router } from 'express';

const router = Router();

// Placeholder route
router.get('/', (req, res) => {
    res.json({ message: 'Service Provider routes working' });
});

export default router;
