import { Router } from "express";
import address from "./address.routes.js";
import cart from "./cart.routes.js";
import wishlist from "./wishlist.routes.js";
const router = Router();

router.use("/address", address);
router.use("/cart", cart);
router.use("/wishlist", wishlist);

export default router;

//asgr
