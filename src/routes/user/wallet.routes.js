import express from "express";
import { createWalletTopup, getMyWallet, getWalletHistory, verifyWalletTopup } from "../../controllers/user/wallet.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create-topup", requireAuth, createWalletTopup);
router.get("/my-wallet", requireAuth, getMyWallet);
router.get("/wallet-history", requireAuth, getWalletHistory);
router.post("/verify-topup", requireAuth, verifyWalletTopup);

export default router;