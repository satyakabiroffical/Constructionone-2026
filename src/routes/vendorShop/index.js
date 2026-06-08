import { Router } from "express";
const router = Router();
import vendorAuth from "./vendor.routes.js";
// import shoptiming from "./shoptiming.routes.js";
import vendorReview from "./vendorReview.routes.js";
import vendorWallet from "./vendorWallet.routes.js";
import vendorWithdrawal from "./vendorWithdrawalBalance.routes.js";
import vendorBankAccount from "./vendorBankAccount.routes.js";
import vendorDashboard from "./vendorDashboard.routes.js";
import vendorInventory from "./inventory.routes.js";
import vendorAbout from "./vendorAbout.routes.js";
import vendorOffer from "./vendorOffer.routes.js";
router.use("/vendor/about", vendorAbout);
router.use("/vendor/offer", vendorOffer);
router.use("/vendors", vendorInventory);


router.use("/vendor", vendorReview);
// router.use("/vendor", shoptiming);
router.use("/vendor", vendorWallet);
router.use("/vendor", vendorWithdrawal);
router.use("/vendor", vendorBankAccount);
router.use("/vendor", vendorDashboard);
router.use("/vendor", vendorAuth);



export default router;
//asgr
