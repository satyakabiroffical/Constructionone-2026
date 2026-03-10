import { Router } from "express";
import {
  createServicePackage,
  deleteServicePackage,
  updateServicePackage,
  getVendorPackages,
} from "../../controllers/serviceProvider/servicePackage.controller.js";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";

const router = Router();
router.post("/create-package", vendorMiddleware, createServicePackage);
router.get("/vendor-packages/:vendorId", authMiddleware, getVendorPackages);
router.put(
  "/update-package/:packageId",
  vendorMiddleware,
  updateServicePackage,
);

router.delete(
  "/delete-package/:packageId",
  vendorMiddleware,
  deleteServicePackage,
);
export default router;
