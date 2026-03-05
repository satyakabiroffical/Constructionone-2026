import { Router } from "express";
import { getVendorsByCategory } from "../../controllers/serviceProvider/serviceProviderVendor.controller.js";

const router = Router();

// Placeholder route
router.get("/vendors/:categoryId", getVendorsByCategory);

export default router;
