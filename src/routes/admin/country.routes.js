import { Router } from "express";
import CountryController from "../../controllers/admin/country.controller.js";
import validate from "../../middlewares/joiValidation.js";
// import {
//   createCountrySchema,
//   updateCountrySchema,
// } from "../../validations/location.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /api/v1

router.get("/countries", requireAuth, CountryController.getCountries);
router.get("/countries/:id", requireAuth, CountryController.getCountry);

router.post(
  "/countries",
  requireAuth,
  //   validate(createCountrySchema),
  CountryController.createCountry,
);


router.patch(
  "/countries/:id",
  requireAuth,
  //   validate(updateCountrySchema),
  CountryController.updateCountry,
);

router.patch(
  "/countries/:id/toggle-status",
  requireAuth,
  CountryController.toggleCountryStatus,
);

router.delete("/countries/:id", requireAuth, CountryController.deleteCountry);

export default router;
