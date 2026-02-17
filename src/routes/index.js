import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import notificationRoutes from "./notification.routes.js";
import userRoutes from "./user/index.js";
import vendorRoutes from "./vendorShop/index.js";
const router = Router();

router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);
router.use("/v1", userRoutes);
router.use("/v1", vendorRoutes);

export default router;
