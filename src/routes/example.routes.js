// src/routes/example.routes.js
import { Router } from 'express';
import { 
  getExamples,
  getExample,
  createExample,
  updateExample,
  deleteExample
} from '../controllers/example.controller.js';

const router = Router();

// All routes are mounted at /api/v1/examples

router.route('/examples')
  .get(getExamples)
  .post(createExample);

router.route('/examples/:id')
  .get(getExample)
  .patch(updateExample)
  .delete(deleteExample);

export default router;
