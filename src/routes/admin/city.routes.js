import { Router } from "express";
import CityController from "../../controllers/admin/city.controller.js";
import validate from "../../middlewares/joiValidation.js";
// import {
//   createCitySchema,
//   updateCitySchema,
// } from "../../validations/location.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /api/v1/material

router.get("/cities", requireAuth, CityController.getCities);
router.get("/cities/:id", requireAuth, CityController.getCity);

router.post(
  "/cities",
  requireAuth,
//   validate(createCitySchema),
  CityController.createCity
);

router.patch(
  "/cities/:id",
  requireAuth,
//   validate(updateCitySchema),
  CityController.updateCity
);

router.patch(
  "/cities/:id/toggle-status",
  requireAuth,
  CityController.toggleCityStatus
);

router.delete("/cities/:id", requireAuth, CityController.deleteCity);

export default router;