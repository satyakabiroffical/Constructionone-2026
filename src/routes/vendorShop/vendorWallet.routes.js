import { Router } from "express";
import { vendorMiddleware } from "../../middlewares/auth.js";
import {
  getWallet,
  getAllTransactionHistory,
} from "../../controllers/vendorShop/vendorWallet.controller.js";
const router = Router();

router.get("/wallet", vendorMiddleware, getWallet);
router.get("/transaction-history", vendorMiddleware, getAllTransactionHistory);
export default router;
