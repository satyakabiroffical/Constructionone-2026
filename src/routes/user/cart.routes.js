//asgr
import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  similarProducts
} from "../../controllers/user/cart.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/addToCart", requireAuth, addToCart);
router.get("/getCart", requireAuth, getCart);
router.put("/update-quantity", requireAuth, updateCartItem);
router.delete("/remove/:variantId", requireAuth, removeCartItem);
router.get("/similar/:productId", requireAuth, similarProducts);

export default router;
