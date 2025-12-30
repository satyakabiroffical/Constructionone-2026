import { Router } from "express";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

import {
  createOrder,
  updateOrder,
  getAllOrder,
  getOrder,
  cancelOrder,
  returnRequest,
} from "../controllers/order.controller.js";

import orderValidation from "../validations/order.validation.js";
import { validateRequest } from "../middleware/validation.js";

const router = Router();

router
  .route("/order")
  .post(
    authMiddleware,
    validateRequest(orderValidation.createOrder),
    createOrder
  )
  .get(authMiddleware, getAllOrder);

router.route("/order/:id").get(authMiddleware, getOrder);

router
  .route("/order/order-status/:id")
  .put(authMiddleware, isAdmin, updateOrder);

router.route("/order/order-status/:id/cancel").put(authMiddleware, cancelOrder);

router.route("/order/:id/return").put(authMiddleware, returnRequest);

router.route("/order/:id/");

export default router;
