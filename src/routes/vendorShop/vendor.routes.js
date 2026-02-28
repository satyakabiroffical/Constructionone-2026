import express from "express";
import { s3Uploader } from "../../middlewares/uploads.js";
import {
  vendorAuth,
  verifyOtp,
  resendOtp,
  loginWithPhone,
  resendAadharOtp,
  verifyAadharOtp,
  upsertVendorInfo,
  getVendorProfile,
  logoutVendor,
  upsertVendorCompanyInfo,
  getAllVendors,
  verifyVendorByAdmin,
  disableVendorStatus,
  getVendorById,
  addMultipleBadgesByAdmin,
  removeMultipleBadgesByAdmin,
  updateUpsertVendorInfo,
  updateUpsertVendorCompanyInfo,
  saveFcmToken,
  getCategoriesByVendorId,
} from "../../controllers/vendorShop/vendor.controller.js";
import { adminMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validation.js";
import {
  vendorProfileValidation,
  vendorCompanyValidation,
} from "../../validations/vendorShop/vendor.validation.js";

const router = express.Router();

//vendorauth
router.post("/auth", vendorAuth);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login/phone", loginWithPhone);

//aadhar varify
router.post("/verify-aadhar-otp/:vendorId", verifyAadharOtp);
router.post("/resend-aadhar-otp/:vendorId", resendAadharOtp);

//vendor profile
router.get("/profile", vendorMiddleware, getVendorProfile);
router.post("/logout", logoutVendor);

//vendor profile details
router.post(
  "/profile",
  vendorMiddleware,
  s3Uploader().fields([{ name: "uploadId", maxCount: 1 }]),
  validateRequest(vendorProfileValidation),
  upsertVendorInfo,
);

//vendor profle updates
router.put(
  "/profile/:vendorProfileId",
  vendorMiddleware,
  s3Uploader().fields([{ name: "uploadId", maxCount: 1 }]),
  updateUpsertVendorInfo,
);

//add shop
router.post(
  "/addshop",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "shopImages", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  validateRequest(vendorCompanyValidation),
  upsertVendorCompanyInfo,
);

//updates in shop
router.put(
  "/addshop/:vendorId",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "shopImages", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  updateUpsertVendorCompanyInfo,
);

// --------------admin api's---------
router.get("/all", adminMiddleware, getAllVendors); //with pagination and limit and also search - name / email / phoneNumber / disable / varified filter
router.post("/admin-varify/:vendorId", adminMiddleware, verifyVendorByAdmin); //vendor varification
router.patch("/:vendorId", adminMiddleware, disableVendorStatus); //eneble and disable vendor profile
router.get("/:vendorId", adminMiddleware, getVendorById);
router.post("/badge/:vendorId", adminMiddleware, addMultipleBadgesByAdmin);
router.post(
  "/remove-badge/:vendorId",
  adminMiddleware,
  removeMultipleBadgesByAdmin,
);
router.post("/saveFcmToken", vendorMiddleware, saveFcmToken);
router.get("/vendorshop/:vendorId", getCategoriesByVendorId);

export default router;
