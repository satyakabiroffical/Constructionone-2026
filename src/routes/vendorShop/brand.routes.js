import { Router } from "express";
import BrandController from "../../controllers/vendorShop/brand.controller.js";
import validate from "../../middleware/joiValidation.js";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../../validations/brand.validation.js";

const router = Router();

// Base: /api/v1/material/brands

router.get("/brands", BrandController.getBrands);
router.get("/brands/:id", BrandController.getBrand);

router.post(
  "/brands",
  validate(createBrandSchema),
  BrandController.createBrand
);

router.patch(
  "/brands/:id",
  validate(updateBrandSchema),
  BrandController.updateBrand
);

router.delete("/brands/:id", BrandController.deleteBrand);

export default router;
