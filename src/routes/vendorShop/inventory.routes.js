import Router from "express";
import {
  getInventory,
  getVendorVariantDetails,
} from "../../controllers/vendorShop/inventory.controller.js";
import { vendorMiddleware } from "../../middlewares/auth.js";
const router = Router();
router.get("/inventory", vendorMiddleware, getInventory);

router.get("/inventory/:variantId", vendorMiddleware, getVendorVariantDetails);
export default router;
