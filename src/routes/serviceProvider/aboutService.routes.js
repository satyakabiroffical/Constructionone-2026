import { Router } from "express";
import { adminMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
import {
  createOrUpdateAboutService,
  getVendorAboutService,
  toggleAboutServiceStatus,
} from "../../controllers/serviceProvider/aboutService.controller.js";
const router = Router();

router.post("/about-service", vendorMiddleware, createOrUpdateAboutService);
router.get("/about-service/:vendorId", getVendorAboutService);

//admin handle toggle
router.patch(
  "/about-service/status/:vendorId",
  adminMiddleware,
  toggleAboutServiceStatus,
);
export default router;
