import express from "express";
import {
  getVendorOverview,
  getAllOrdersForVendor,
  getOrderByIdForVendor,
  vendorUpdateOrder,
} from "../../controllers/vendorShop/vendorDashboard.js";
import {
  authMiddleware,
  vendorMiddleware,
  adminMiddleware,
} from "../../middlewares/auth.js";

const router = express.Router();
router.get("/dashboard/overview", vendorMiddleware, getVendorOverview);
router.get("/dashboard/orders", vendorMiddleware, getAllOrdersForVendor);
router.get(
  "/dashboard/orders/:orderId",
  vendorMiddleware,
  getOrderByIdForVendor,
);
router.patch(
  "/dashboard/orders/:subOrderId",
  vendorMiddleware,
  vendorUpdateOrder,
);

export default router;
