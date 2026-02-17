// src/routes/example.routes.js
import { Router } from 'express';
import { 
  getExamples,
//   getExample,
//   createExample,
//   updateExample,
//   deleteExample
} from '../controllers/example.controller.js';

const router = Router();

// All routes are mounted at /api/v1/examples

router.get('/examples',getExamples)
// router.post('/examples',createExample);

// router.get('/examples/:id',getExample)
// router.patch('/examples/:id',updateExample)
// router.delete('/examples/:id',deleteExample);

//   router.get("/cluster-check", (req, res) => {
//   res.json({
//     message: "Cluster working",
//     pid: process.pid
//   });
// });

export default router;
