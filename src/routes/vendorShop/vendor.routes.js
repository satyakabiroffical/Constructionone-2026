import express from "express";
import { s3Uploader } from "../../middlewares/uploads.js";
import {
  vendorAuth,
  verifyOtp,
  businessSetup,
  resendOtp,
  loginWithPhone,
  resendAadharOtp,
  verifyAadharOtp,
  upsertVendorInfo,
  getVendorProfile,
  logoutVendor,
  upsertVendorCompanyInfo,
  getAllVendors,
  getAllVendorCompany,
  getUnverifiedVendors,
  verifyVendorByAdmin,
  disableVendorStatus,
  getVendorById,
  addMultipleBadgesByAdmin,
  removeMultipleBadgesByAdmin,
  updateUpsertVendorInfo,
  updateUpsertVendorCompanyInfo,
  saveFcmToken,
  getCategoriesByVendorId,
  refreshTokenHandler,
  getProductsByVendorAndCategory,
  getAllVendorsViaModuleId,
  getVendorByIdForUser,
  getSimilarCompanies,
} from "../../controllers/vendorShop/vendor.controller.js";
import {
  adminMiddleware,
  vendorMiddleware,
  authMiddleware,
} from "../../middlewares/auth.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
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

router.post("/business-type", vendorMiddleware, businessSetup);
router.post("/login/phone", loginWithPhone);

//aadhar varify
router.post("/verify-aadhar-otp/:vendorId", verifyAadharOtp);
router.post("/resend-aadhar-otp/:vendorId", resendAadharOtp);

//vendor profile
router.get("/profile/:vendorId", authMiddleware, getVendorProfile);
router.post("/logout", vendorMiddleware, logoutVendor);

//vendor profile details
router.post(
  "/profile",
  vendorMiddleware,
  s3Uploader().fields([{ name: "uploadId", maxCount: 2 }]),
  validateRequest(vendorProfileValidation),
  upsertVendorInfo,
);

//vendor profle updates
router.put(
  "/profile/:vendorProfileId",
  vendorMiddleware,
  s3Uploader().fields([{ name: "uploadId", maxCount: 2 }]),
  updateUpsertVendorInfo,
);

//add shop
router.post(
  "/addshop",
  // vendorMiddleware,
  s3Uploader().fields([
    { name: "shopImages", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  validateRequest(vendorCompanyValidation),
  upsertVendorCompanyInfo,
);

router.get("/vendorshops", authMiddleware, getAllVendorCompany);
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
router.get("/unverified", adminMiddleware, getUnverifiedVendors);
router.get("/all", adminMiddleware, getAllVendors); //with pagination and limit and also search - name / email / phoneNumber / disable / varified filter
router.get("/module/:moduleId", adminMiddleware, getAllVendorsViaModuleId);
router.post("/admin-varify/:vendorId", adminMiddleware, verifyVendorByAdmin); //vendor varification
router.patch("/:vendorId", adminMiddleware, disableVendorStatus); //eneble and disable vendor profile
router.get("/:vendorId", adminMiddleware, getVendorById);
router.get("/user/:vendorId", authMiddleware, getVendorByIdForUser);
router.get("/user/:vendorId/similar", authMiddleware, getSimilarCompanies);
router.post("/badge/:vendorId", adminMiddleware, addMultipleBadgesByAdmin);
router.post(
  "/remove-badge/:vendorId",
  adminMiddleware,
  removeMultipleBadgesByAdmin,
);

router.post("/saveFcmToken", vendorMiddleware, saveFcmToken);
router.post("/refresh-token", refreshTokenHandler);
router.get("/vendorshop/:vendorId", getCategoriesByVendorId);
router.get("/vendorshop/:vendorId/:categoryId", getProductsByVendorAndCategory);

export default router;
