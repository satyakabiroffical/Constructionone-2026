import { Router } from "express";
import address from "./address.routes.js";
import cart from "./cart.routes.js";
const router = Router();

router.use("/address", address);
router.use("/cart", cart);

export default router;

//asgr
