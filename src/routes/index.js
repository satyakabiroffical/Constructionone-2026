// src/routes/index.js
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
const router = Router();

// Mount routes

router.use("/v1", exampleRoutes);

export default router;
