import { Router } from "express";
import {
    adminGetAllOrders,
    updateSingleProductStatus,
    updateAllProductsStatus,
} from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validation.js";
import { orderValidation } from "../../validations/productOrder.validation.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

// GET  /api/v1/admin/orders            — list all orders (with filters & pagination)
router.get("/orders", adminGetAllOrders);

// PATCH /api/v1/admin/orders/item-status
// body: { subOrderId, variantId, status }
// Updates a single product's status; restores stock on CANCELLED / RETURNED
router.patch("/orders/item-status",validateRequest(orderValidation.updateStatusValidation), updateSingleProductStatus);

// PATCH /api/v1/admin/orders/all-items-status
// body: { subOrderId, status }
// Updates every item in a sub-order; restores stock on CANCELLED / RETURNED
router.patch("/orders/all-items-status", validateRequest(orderValidation.updateStatusValidation), updateAllProductsStatus);

export default router;
