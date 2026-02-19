import { Router } from "express";
import BrandController from "../../controllers/vendorShop/brand.controller.js";
import validate from "../../middlewares/joiValidation.js";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../../validations/brand.validation.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = Router();

// Base: /api/v1/material/brands

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

router.delete("/brands/:id", requireAuth, BrandController.deleteBrand);

export default router;
