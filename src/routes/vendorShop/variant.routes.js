import { Router } from "express";
import VariantController from "../../controllers/vendorShop/variant.controller.js";
import validate from "../../middleware/joiValidation.js";
import { createVariantSchema } from "../../validations/variant.validation.js";

const router = Router();

// Base: /api/v1/material/variants

router.get("/variants", VariantController.getVariants);

router.post(
  "/variants",
  validate(createVariantSchema),
  VariantController.createVariant,
);

export default router;
