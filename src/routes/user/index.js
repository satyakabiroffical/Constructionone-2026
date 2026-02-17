import { Router } from "express";
import address from "./address.routes.js";
import cart from "./cart.routes.js";
import wallet from "./wallet.routes.js";
const router = Router();

router.use("/address", address);
router.use("/cart", cart);
router.use("/wallet", wallet);

export default router;

//asgr
