import { Router } from "express";
import exampleRoutes from "./example.routes.js";
const router = Router();
import notificationRoutes from "./notification.routes.js";

router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);

export default router;
