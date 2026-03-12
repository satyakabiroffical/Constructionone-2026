import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getAllOrders,
  getOrdersByVendor,
  cancelOrder,
  vendorUpdateOrder,
  getOrderById,
  updateSingleProductStatus,
  updateAllProductsStatus,
  createShippingLabel,
  updateOrderToDelivered,
} from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { vendorMiddleware } from "../../middlewares/auth.js";
import { idempotencyMiddleware } from "../../middlewares/idempotency.middleware.js";

const router = Router();

router.post(
  "/create",
  requireAuth,
  // idempotencyMiddleware,
  createOrder,
);
router.post("/verify-payment", requireAuth, verifyPayment);
router.get("/my-orders", requireAuth, getAllOrders);
router.put("/:orderId/cancel", requireAuth, cancelOrder);

// vendor routes
router.get("/vendor-orders/:vendorId", requireAuth, getOrdersByVendor);
router.put(
  "/vendor/sub-order/:subOrderId",
  vendorMiddleware,
  vendorUpdateOrder,
);

router.put(
  "/vendor/updateSingleProductStatus",
  vendorMiddleware,
  updateSingleProductStatus,
);
router.put(
  "/vendor/all-items-status",
  vendorMiddleware,
  updateAllProductsStatus,
);
router.post("/vendor/generate-label/:orderId", createShippingLabel);
router.get("/:orderId", requireAuth, getOrderById);

router.patch("/:orderId/delivered", updateOrderToDelivered);

export default router;
