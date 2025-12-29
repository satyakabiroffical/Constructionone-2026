import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  addToCart,
  removeProduct,
  getCartProduct,
  clearCart,
} from "../controllers/cart.controller.js";

const router = Router();

router
  .route("/cart")
  .get(authMiddleware, getCartProduct)
  .post(authMiddleware, addToCart)
  .delete(authMiddleware, clearCart);

router.route("/cart/:productId").delete(authMiddleware, removeProduct);

export default router;
