import { Router } from "express";
const router = Router();
import vendorRoutes from "./vendor.routes.js";
import shoptiming from "./shoptiming.routes.js";
import vendorReview from "./vendorReview.routes.js";
import vendorWallet from "./vendorWallet.routes.js";
import vendorWithdrawal from "./vendorWithdrawalBalance.routes.js";

router.use("/vendor", vendorRoutes);
router.use("/vendor", vendorReview);
router.use("/vendor", shoptiming);
router.use("/vendor", vendorWallet);
router.use("/vendor", vendorWithdrawal);

export default router;
//asgr
