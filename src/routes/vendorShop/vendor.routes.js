import express from "express";
import { s3Uploader } from "../../middleware/uploads.js";
import {
  createVendor,
  updateVendor,
  updateVendorVerificationStatus,
  getVendorProfile,
} from "../../controllers/vendorShop/vendor.controller.js";

import { authMiddleware, adminMiddleware } from "../../middleware/auth.js";

const router = express.Router();

router.post(
  "/",
  s3Uploader().fields([
    { name: "storefrontPhotos", maxCount: 10 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
    { name: "isoCertificate", maxCount: 1 },
  ]),
  createVendor,
);

router.put(
  "/:id",
  s3Uploader().fields([
    { name: "storefrontPhotos", maxCount: 5 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
    { name: "isoCertificate", maxCount: 1 },
  ]),
  updateVendor,
);
router.get("/profile", authMiddleware, getVendorProfile);

router.put("/:id/verify", adminMiddleware, updateVendorVerificationStatus);

export default router;
