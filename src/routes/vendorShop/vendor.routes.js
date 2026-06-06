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
  getProductsByVendorAndCategory,
  getAllVendorsViaModuleId,
  getVendorByIdForUser,
  getSimilarCompanies,
  updateVendorProfile,
  updateVendorCompany,
  getVendorCompany,
  getVendorPersonalProfile,
  getVendorCertificates,
  deleteVendorCascade,
  getVendorProfileInfo,
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
import { exportVendors } from "../../controllers/marketPlace/exportDataInFiles.controller.js";
const router = express.Router();

// router.delete("/vendor-data/:vendorId", adminMiddleware, deleteVendorCascade);

// profile--------

router.get("/company-profile", vendorMiddleware, getVendorCompany);
router.get("/personal-profile", vendorMiddleware, getVendorPersonalProfile);
router.get("/certificates", vendorMiddleware, getVendorCertificates);
router.put("/personal-profile", vendorMiddleware, updateVendorProfile);
router.put("/company-profile", vendorMiddleware, updateVendorCompany);

//vendorauth
router.post("/auth", vendorAuth);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/login/phone", loginWithPhone);

//aadhar varify
router.post("/verify-aadhar-otp/:vendorId", verifyAadharOtp);
router.post("/resend-aadhar-otp/:vendorId", resendAadharOtp);

//vendor profile
router.get("/profile-vendorapp", vendorMiddleware, getVendorProfileInfo);
router.get("/profile", vendorMiddleware, getVendorProfile);
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
  vendorMiddleware,
  s3Uploader().fields([
    { name: "shopImages", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
    { name: "cancelledCheque", maxCount: 1 },
  ]),
  // validateRequest(vendorCompanyValidation),
  upsertVendorCompanyInfo,
);

// for user app 
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
import { requirePermission } from "../../middlewares/role.middleware.js";

// --------------admin api's---------
router.get(
  "/unverified",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  getUnverifiedVendors,
);
router.get("/all", adminMiddleware, getAllVendors); //with pagination and limit and also search - name / email / phoneNumber / disable / varified filter
router.get(
  "/module/:moduleId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  getAllVendorsViaModuleId,
);
router.post(
  "/admin-varify/:vendorId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  verifyVendorByAdmin,
); //vendor varification
router.patch(
  "/:vendorId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  disableVendorStatus,
); //eneble and disable vendor profile
router.get(
  "/:vendorId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  getVendorById,
);
router.get("/user/:vendorId", authMiddleware, getVendorByIdForUser);
router.get("/user/:vendorId/similar", authMiddleware, getSimilarCompanies);
router.post(
  "/badge/:vendorId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  addMultipleBadgesByAdmin,
);
router.post(
  "/remove-badge/:vendorId",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  removeMultipleBadgesByAdmin,
);

router.post("/saveFcmToken", vendorMiddleware, saveFcmToken);
router.get("/vendorshop/:vendorId", getCategoriesByVendorId);
router.get("/vendorshop/:vendorId/:categoryId", getProductsByVendorAndCategory);

router.get(
  "/vendors/export",
  adminMiddleware,
  requirePermission("MARKETPLACE_VENDORS"),
  exportVendors,
);

export default router;
