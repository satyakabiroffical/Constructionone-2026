import { Router } from "express";
import {
    adminGetAllOrders,
    updateSingleProductStatus,
    updateAllProductsStatus,
} from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

// GET  /api/v1/admin/orders            — list all orders (with filters & pagination)
router.get("/orders", adminGetAllOrders);

// PATCH /api/v1/admin/orders/item-status
// body: { subOrderId, variantId, status }
// Updates a single product's status; restores stock on CANCELLED / RETURNED
router.patch("/orders/item-status", updateSingleProductStatus);

// PATCH /api/v1/admin/orders/all-items-status
// body: { subOrderId, status }
// Updates every item in a sub-order; restores stock on CANCELLED / RETURNED
router.patch("/orders/all-items-status", updateAllProductsStatus);

export default router;
