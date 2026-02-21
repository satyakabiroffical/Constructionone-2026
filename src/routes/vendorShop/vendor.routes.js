import express from "express";
import { s3Uploader } from "../../middlewares/uploads.js";
import {
  getVendorProfile,
  vendorAuth,
  verifyOtp,
  resendOtp,
  loginWithPhone,
  logoutVendor,
  verifyAadharOtp,
  resendAadharOtp,
  upsertVendorCompanyInfo,
  upsertVendorInfo,
  getAllVendors,
} from "../../controllers/vendorShop/vendor.controller.js";
import { adminMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
import { isAdmin } from "../../middlewares/role.js";
import { validateRequest } from "../../middlewares/validation.js";
import {
  vendorProfileValidation,
  vendorCompanyValidation,
} from "../../validations/vendorShop/vendor.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/auth", vendorAuth);
router.post("/login/phone", loginWithPhone);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/profile", vendorMiddleware, getVendorProfile);

router.post(
  "/profile",
  s3Uploader().fields([{ name: "uploadId", maxCount: 1 }]),
  vendorMiddleware,
  validateRequest(vendorProfileValidation),
  upsertVendorInfo,
);

router.post(
  "/addshop",
  s3Uploader().fields([
    { name: "shopImages", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  // validateRequest(vendorCompanyValidation),
  upsertVendorCompanyInfo,
);
router.post("/verify-aadhar-otp/:vendorId", verifyAadharOtp);
router.post("/resend-aadhar-otp/:vendorId", resendAadharOtp);

// --------------admin ---------
router.get("/all", getAllVendors);

export default router;
