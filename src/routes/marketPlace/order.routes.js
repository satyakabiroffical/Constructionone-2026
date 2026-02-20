import { Router } from "express";
import { createOrder, verifyPayment } from "../../controllers/marketPlace/order.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", requireAuth, createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);

export default router;
