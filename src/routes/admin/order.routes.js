import { Router } from "express";
import { adminGetAllOrders } from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/orders", adminGetAllOrders);

export default router;
