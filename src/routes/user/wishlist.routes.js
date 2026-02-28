//asgr
import { Router } from "express";
import {
  toggleWishlist,
  getWishlist,
} from "../../controllers/user/wishlist.controller.js";

const router = Router();

router.patch("/", toggleWishlist);
router.get("/", getWishlist);

export default router;
