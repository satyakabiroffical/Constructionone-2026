import {
  addToWishlist,
  clearWishlist,
  removeFromWishlist,
  getWishlist,
} from "../controllers/wishlist.controller.js";
import authMiddleware from "../middleware/auth.js";
import { Router } from "express";
const router = Router();

router
  .route("/wishlist/:productid")
  .post(authMiddleware, addToWishlist)
  .delete(authMiddleware, removeFromWishlist);

router
  .route("/wishlist")
  .get(authMiddleware, getWishlist)
  .delete(authMiddleware, clearWishlist);

export default router;
