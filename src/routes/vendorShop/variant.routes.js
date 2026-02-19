import { Router } from "express";
import VariantController from "../../controllers/vendorShop/variant.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createVariantSchema } from "../../validations/variant.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = Router();

// Base: /api/v1/material/variants

router.get("/variants", requireAuth, VariantController.getVariants);

router.post(
  "/variants",
  requireAuth,
  validate(createVariantSchema),
  VariantController.createVariant,
);

export default router;
