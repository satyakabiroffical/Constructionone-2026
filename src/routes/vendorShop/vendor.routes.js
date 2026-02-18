import express from "express";
import { s3Uploader } from "../../middlewares/uploads.js";
import {
  vendorSignUp,
  vendorLogin,
  updateVendor,
  updateVendorVerificationStatus,
  getVendorProfile,
} from "../../controllers/vendorShop/vendor.controller.js";
import { vendorMiddleware } from "../../middlewares/auth.js";
import { isAdmin } from "../../middlewares/role.js";
import { validateRequest } from "../../middlewares/validation.js";
import { vendorValidation } from "../../validations/vendorShop/vendor.validation.js";
const router = express.Router();
router.post(
  "/signup",
  s3Uploader().fields([
    { name: "storefrontPhotos", maxCount: 5 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
    { name: "isoCertificate", maxCount: 1 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  validateRequest(vendorValidation.createVendor),
  vendorSignUp,
);
router.post("/login", vendorLogin);

router.put(
  "/:id",
  s3Uploader().fields([
    { name: "storefrontPhotos", maxCount: 5 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
    { name: "isoCertificate", maxCount: 1 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  validateRequest(vendorValidation.updateVendor),
  updateVendor,
);
router.get("/profile", vendorMiddleware, getVendorProfile);

router.put(
  "/:id/verify",
  vendorMiddleware,
  isAdmin,
  updateVendorVerificationStatus,
);

export default router;
