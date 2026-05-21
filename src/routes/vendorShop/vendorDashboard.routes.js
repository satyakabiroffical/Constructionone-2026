import express from "express";
import {
  getVendorOverview,
  getAllOrdersForVendor,
  getOrderByIdForVendor,
  vendorUpdateOrder,
  getAllProducts,
  getProductById,
  updateProduct,
  profileWallet,
} from "../../controllers/vendorShop/vendorDashboard.js";
import {
  authMiddleware,
  vendorMiddleware,
  adminMiddleware,
} from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";

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
router.get("/dashboard/products", vendorMiddleware, getAllProducts);
router.get("/dashboard/products/:productId", vendorMiddleware, getProductById);
router.put(
  "/dashboard/products/:productId",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateProduct,
);

router.get("/dashboard/profile/wallet", vendorMiddleware, profileWallet);

export default router;
