import { Router } from "express"; //Sanvi
import VariantController from "../../controllers/vendorShop/variant.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createVariantSchema } from "../../validations/variant.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = Router();

// Base: /api/v1/material/variants

router.get("/variants", requireAuth, VariantController.getVariants);
router.get(
  "/variant/:id",
  requireAuth,
  VariantController.getVariantById
);
router.post(
  "/variant",
  requireAuth,
  validate(createVariantSchema),
  VariantController.addVariant,
);


router.patch(
  "/variant/:id/toggle",
  requireAuth,
  VariantController.toggleVariantStatus
);

router.put("/variant/:id", requireAuth, VariantController.updateVariant);

router.delete(
  "/variant/:id",
  requireAuth,
  VariantController.deleteVariant
);




export default router;
