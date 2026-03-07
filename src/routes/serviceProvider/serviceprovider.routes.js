//asgr
import { Router } from "express";
import {
  getVendorsByCategory,
  createServiceProfile,
  updateServiceProfile,
  getServiceProfile,
  getAllServiceProviderVendors,
  getServiceVendorProfile,
} from "../../controllers/serviceProvider/serviceProviderVendor.controller.js";
import {
  adminMiddleware,
  authMiddleware,
  vendorMiddleware,
} from "../../middlewares/auth.js";

const router = Router();

// Placeholder route
router.get("/", authMiddleware, getAllServiceProviderVendors);
router.get("/:categoryId", authMiddleware, getVendorsByCategory);
router.post("/create", vendorMiddleware, createServiceProfile);
router.put("/update", vendorMiddleware, updateServiceProfile);
// router.get("/:vendorId", authMiddleware, getServiceVendorProfile);
router.get("/:vendorId/profile", authMiddleware, getServiceProfile);

export default router;
