import { Router } from "express";
import { createOrder, verifyPayment, getAllOrders, getOrdersByVendor, cancelOrder, vendorUpdateOrder, getOrderById, updateSingleProductStatus, updateAllProductsStatus } from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { vendorMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.post("/create", requireAuth, createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);
router.get("/my-orders", requireAuth, getAllOrders);
router.get("/vendor-orders/:vendorId", requireAuth, getOrdersByVendor);
router.put("/:orderId/cancel", requireAuth, cancelOrder);
router.put("/vendor/sub-order/:subOrderId", vendorMiddleware, vendorUpdateOrder);

// Vendor: update sub-order status  →  PUT /order/:orderId/status
// (vendor sees only their own sub-order; requireRole ensures vendor)
router.put("/vendor/updateSingleProductStatus", vendorMiddleware, updateSingleProductStatus);
router.put("/vendor/all-items-status", vendorMiddleware, updateAllProductsStatus);

router.get("/:orderId", requireAuth, getOrderById);




export default router;

