import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import notificationRoutes from "./notification.routes.js";
import userRoutes from "./user/index.js";
import walletRoutes from "./user/wallet.routes.js";
const router = Router();

router.use("/v1", exampleRoutes);
router.use("/v1", notificationRoutes);
router.use("/v1", userRoutes);
router.use("/v1", walletRoutes);

export default router;
