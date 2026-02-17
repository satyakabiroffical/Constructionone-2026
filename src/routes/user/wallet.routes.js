import express from "express";
import { createWalletTopup, getMyWallet, getWalletHistory, verifyWalletTopup } from "../../controllers/user/wallet.controller.js";

const router = express.Router();

router.post("/create-topup", createWalletTopup);
router.get("/my-wallet", getMyWallet);
router.get("/wallet-history", getWalletHistory);
router.post("/verify-topup", verifyWalletTopup);

export default router;