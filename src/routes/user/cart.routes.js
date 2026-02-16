//asgr
import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
} from "../../controllers/user/cart.controller.js";

const router = Router();

router.post("/", addToCart);
router.get("/", getCart);
router.put("/:productId", updateCartItem);
router.delete("/:productId", removeCartItem);

export default router;
