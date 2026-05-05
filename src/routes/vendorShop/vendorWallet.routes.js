import { Router } from "express";
import { vendorMiddleware } from "../../middlewares/auth.js";
import {
  getWallet,
  getAllTransactionHistory,
  getVendorEarningAnalytics,
  getTransactionDetails,
  getVendorAnalytics,
  getAllTopSellingProducts,
  getAllTopRatedProducts,
} from "../../controllers/vendorShop/vendorWallet.controller.js";
const router = Router();

router.get("/wallet", vendorMiddleware, getWallet);
router.get("/analytics", vendorMiddleware, getVendorAnalytics);
router.get("/top-selling-products", vendorMiddleware, getAllTopSellingProducts);
router.get("/top-rated-products", vendorMiddleware, getAllTopRatedProducts);
router.get("/earning-analytics", vendorMiddleware, getVendorEarningAnalytics);
router.get("/transaction-history", vendorMiddleware, getAllTransactionHistory);
router.get(
  "/transaction-history/:transactionId",
  vendorMiddleware,
  getTransactionDetails,
);
export default router;
