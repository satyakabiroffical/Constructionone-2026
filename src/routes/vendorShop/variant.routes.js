import { Router } from "express"; //Sanvi
import VariantController from "../../controllers/vendorShop/variant.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createVariantSchema } from "../../validations/variant.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  adminMiddleware,
  authMiddleware,
  vendorMiddleware,
} from "../../middlewares/auth.js";
const router = Router();

// Base: /api/v1/material/variants

router.get("/variants", authMiddleware, VariantController.getVariants);
router.get("/variant/:id", authMiddleware, VariantController.getVariantById);
router.post(
  "/variant",
  vendorMiddleware,
  // validate(createVariantSchema),
  VariantController.addVariant,
);

router.patch(
  "/variant/:id/toggle",
  authMiddleware,
  VariantController.toggleVariantStatus,
);

router.put("/variant/:id", vendorMiddleware, VariantController.updateVariant);

router.delete("/variant/:id", requireAuth, VariantController.deleteVariant);

export default router;
