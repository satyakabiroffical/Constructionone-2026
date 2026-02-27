import { Router } from "express"; // Sanvi
import PincodeController from "../../controllers/admin/pincode.controller.js";
import validate from "../../middlewares/joiValidation.js";
// import {
//   createPincodeSchema,
//   updatePincodeSchema,
// } from "../../validations/location.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /api/v1/material

router.get("/pincodes", requireAuth, PincodeController.getPincodes);
router.get("/pincodes/:id", requireAuth, PincodeController.getPincode);

router.post(
  "/pincodes",
  requireAuth,
  //   validate(createPincodeSchema),
  PincodeController.createPincode,
);

router.post(
  "/pincodes/bulk",
  requireAuth,
  PincodeController.bulkCreatePincodes,
);

router.patch(
  "/pincodes/:id",
  requireAuth,
  //   validate(updatePincodeSchema),
  PincodeController.updatePincode,
);

router.patch(
  "/pincodes/:id/toggle-status",
  requireAuth,
  PincodeController.togglePincodeStatus,
);

router.delete("/pincodes/:id", requireAuth, PincodeController.deletePincode);

export default router;
