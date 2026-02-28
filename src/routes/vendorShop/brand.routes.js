import { Router } from "express";
import BrandController from "../../controllers/vendorShop/brand.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../../validations/brand.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /api/v1/material

router.get("/brands", requireAuth, BrandController.getBrands);
router.get("/brands/:id", requireAuth, BrandController.getBrand);

router.post(
  "/brands",
  requireAuth,
  validate(createBrandSchema),
  BrandController.createBrand,
);

router.patch(
  "/brands/:id",
  requireAuth,
  validate(updateBrandSchema),
  BrandController.updateBrand,
);

//  toggle enable/disable
router.patch(
  "/brands/:id/toggle-status",
  requireAuth,
  BrandController.toggleBrandStatus,
);

router.delete("/brands/:id", requireAuth, BrandController.deleteBrand);
//vendor section
//get vendor brands and available product in vendor shop section
router.get(
  "/brands/vendorshop/:vendorId",
  authMiddleware,
  BrandController.getVendorBrands,
);
export default router;
