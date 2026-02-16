// src/routes/index.js
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import notificationRoutes from "./notification.routes.js";
const router = Router();

// Mount routes

router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);

export default router;
