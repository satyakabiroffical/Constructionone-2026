import { Router } from "express";
import { adminGetAllOrders, updateOrderStatus } from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/orders", adminGetAllOrders);

// PUT /admin/order/:orderId/status
// body: { status, orderType: "MASTER" | "SUB" }
router.put("/:orderId/status", updateOrderStatus);

export default router;
