//asgrDevv
import {
  VendorProfile,
  VendorCompany,
} from "../../models/vendorShop/vendor.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import https from "https";
const MAX_OTP_ATTEMPTS = 3;
const COOLDOWN_PERIOD = 50 * 1000;
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import productModel from "../../models/vendorShop/product.model.js";
import mongoose from "mongoose";
import refreshTokenModel from "../../models/vendorShop/refreshToken.model.js";
import VendorBankAccount from "../../models/vendorShop/vendorBankAccount.model.js";

//vendor auth
export const vendorAuth = async (req, res) => {
  try {
    const { moduleId, phoneNumber } = req.body;
    const phoneValidation = validatePhone(phoneNumber);

    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error,
      });
    }

    const validatedPhone = phoneValidation.normalized;

    let user = await VendorProfile.findOne({
      phoneNumber: validatedPhone,
    });
    // const otp = generateOtp();
    const otp = 1234; // testing
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);

    const phoneOtpData = {
      codeHash: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    };

    if (user) {
      // Admin verified → LOGIN
      if (user.isAdminVerified) {
        return res.status(200).json({
          success: true,
          type: "LOGIN",
          message: "Account already exists. Please login.",
        });
      }

      // All completed but admin false → UNDER REVIEW
      if (
        user.isPhoneVerified &&
        user.isAadharVerified &&
        user.isProfileCompleted
      ) {
        return res.status(200).json({
          success: true,
          type: "UNDER_REVIEW",
          message: "Your profile is under review. Please wait.",
        });
      }

      // Otherwise → continue (OTP resend)

      user.phoneOtp = phoneOtpData;
      await user.save();

      return res.status(200).json({
        success: true,
        type: "REGISTER",
        message: "OTP sent. Continue registration.",
      });
    }

    await VendorProfile.create({
      phoneNumber: validatedPhone,
      moduleId,
      phoneOtp: phoneOtpData,
    });

    return res.status(200).json({
      success: true,
      type: "REGISTER",
      message: "OTP sent successfully. Please verify to register.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await VendorProfile.findOne({ phoneNumber });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor not found" });
    }

    const { codeHash, expiresAt, attempts = 0 } = user.phoneOtp;
    if (!codeHash) {
      user.phoneOtp = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: "OTP data is invalid. Please request a new OTP",
      });
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      user.phoneOtp = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new OTP",
      });
    }

    if (attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: "Maximum OTP attempts exceeded. Please request a new OTP",
      });
    }

    const normalizedOtp = String(otp || "").trim();
    if (!normalizedOtp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const isMatch = await bcrypt.compare(normalizedOtp, codeHash);

    if (!isMatch) {
      user.phoneOtp.attempts = attempts + 1;
      await user.save();

      const remainingAttempts = MAX_OTP_ATTEMPTS - (attempts + 1);
      return res.status(400).json({
        success: false,
        error:
          remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining`
            : "Invalid OTP. No attempts remaining, please request a new OTP",
      });
    }
    user.phoneOtp = null;
    user.isPhoneVerified = true;
    await user.save();

    const jwtToken = jwt.sign(
      { id: user._id, role: "vendor" },
      process.env.JWT_SECRET,
      { expiresIn: "365d" },
    );

    // const accessToken = jwt.sign(
    //   { id: user._id, role: "vendor" },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "15m" },
    // );

    // const refreshToken = jwt.sign(
    //   { id: user._id },
    //   process.env.REFRESH_TOKEN_SECRET,
    //   { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
    // );

    // // remove old token for same device
    // await refreshTokenModel.deleteMany({
    //   vendorId: user._id,
    //   deviceId,
    // });

    // await refreshTokenModel.create({
    //   vendorId: user._id,
    //   token: refreshToken,
    //   deviceId,
    //   expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    // });

    const safeUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
      isAdminVerified: user.isAdminVerified,
      isAadharVerified: user.isAadharVerified,
      isProfileCompleted: user.isProfileCompleted,
    };

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: safeUser,
      token: jwtToken,
      // accessToken,
      // refreshToken,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

//vendor select a business types according to module.
export const businessSetup = async (req, res, next) => {
  try {
    const id = req.user.id;
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: "moduleId is required",
      });
    }

    const updatedProfile = await VendorProfile.findByIdAndUpdate(
      id,
      { moduleId },
      { new: true, runValidators: true },
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Business setup updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const user = await VendorProfile.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found. Please register first.",
      });
    }

    const now = new Date();
    let attempts = user.phoneOtp?.attempts || 0;
    const lastSentAt = user.phoneOtp?.lastSentAt
      ? new Date(user.phoneOtp.lastSentAt)
      : null;

    // --- Check if user has hit 3 attempts and needs cooldown ---
    if (attempts >= MAX_OTP_ATTEMPTS && lastSentAt) {
      const timeSinceLastOtp = now - lastSentAt;

      if (timeSinceLastOtp < COOLDOWN_PERIOD) {
        // Still in cooldown period
        const waitTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastOtp) / 1000);
        return res.status(429).json({
          success: false,
          error: `You've used all 3 attempts. Please wait ${waitTime} seconds before requesting another OTP`,
        });
      } else {
        // Cooldown period over, reset attempts
        attempts = 0;
      }
    }

    // --- Generate new OTP ---
    // const otp = generateOtp();
    const otp = 1234; // For testing purposes, replace with generateOtp() in production

    const hashedOtp = await bcrypt.hash(otp.toString(), 10);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // setImmediate(() => {
    //   sendOtpViaMSG91(validatedPhone, otp).catch(() => {});
    // });

    // --- Update user with new OTP data ---
    user.phoneOtp = {
      codeHash: hashedOtp,
      expiresAt,
      attempts: attempts + 1,
      lastSentAt: now,
    };

    await user.save();
    const remainingAttempts = MAX_OTP_ATTEMPTS - (attempts + 1);
    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      remainingAttempts: remainingAttempts,
      ...(remainingAttempts === 0 && {
        note: "You've used all 3 attempts. Next OTP can be requested after 50 seconds",
      }),
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};

//aadhar-varification
export const verifyAadharOtp = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { otp } = req.body;
    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    const { codeHash, expiresAt, attempts = 0 } = vendor.aadharOtp;

    if (!codeHash) {
      vendor.aadharOtp = null;
      return res.status(400).json({
        success: false,
        error: "OTP data is invalid. Please request a new OTP",
      });
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      vendor.aadharOtp = null;
      await vendor.save();
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new OTP",
      });
    }

    if (attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: "Maximum OTP attempts exceeded. Please request a new OTP",
      });
    }

    const normalizedOtp = String(otp || "").trim();

    if (!normalizedOtp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const isMatch = await bcrypt.compare(normalizedOtp, codeHash);
    if (!isMatch) {
      vendor.aadharOtp.attempts = attempts + 1;
      const remainingAttempts = MAX_OTP_ATTEMPTS - (attempts + 1);
      return res.status(400).json({
        success: false,
        error:
          remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining`
            : "Invalid OTP. No attempts remaining, please request a new OTP",
      });
    }

    vendor.isAadharVerified = true;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Aadhar verified successfully",
      data: {
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        phoneNumber: vendor.phoneNumber,
        email: vendor.email,
        isAadharVerified: vendor.isAadharVerified,
        isAdminVerified: vendor.isAdminVerified,
        isProfileCompleted: vendor.isProfileCompleted,
        governmentIdNumber: vendor.governmentIdNumber,
        governmentIdType: vendor.governmentIdType,
        uploadId: vendor.uploadId,
      },
    });
  } catch (error) {
    console.error("Static Aadhar Verify Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const resendAadharOtp = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const user = await VendorProfile.findById(vendorId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor not found" });
    }

    if (user.isAadharVerified) {
      return res.status(400).json({
        success: false,
        error: "Aadhar already verified",
      });
    }

    const now = new Date();
    let attempts = user.aadharOtp?.attempts || 0;
    const lastSentAt = user.aadharOtp?.lastSentAt
      ? new Date(user.aadharOtp.lastSentAt)
      : null;

    // --- Check if user has hit 3 attempts and needs cooldown ---
    if (attempts >= MAX_OTP_ATTEMPTS && lastSentAt) {
      const timeSinceLastOtp = now - lastSentAt;

      if (timeSinceLastOtp < COOLDOWN_PERIOD) {
        const waitTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastOtp) / 1000);
        return res.status(429).json({
          success: false,
          error: `You've used all 3 attempts. Please wait ${waitTime} seconds before requesting another OTP`,
        });
      } else {
        // Cooldown period over, reset attempts
        attempts = 0;
      }
    }

    // --- Generate new OTP ---
    // const otp = generateOtp();
    let otp = 1234; // For testing purposes, replace with generateOtp() in production

    const hashedOtp = await bcrypt.hash(otp.toString(), 10);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // setImmediate(() => {
    //   sendOtpViaMSG91(validatedPhone, otp).catch(() => {});
    // });

    // --- Update user with new OTP data ---
    user.aadharOtp = {
      codeHash: hashedOtp,
      expiresAt,
      attempts: attempts + 1,
      lastSentAt: now,
    };

    await user.save();
    const remainingAttempts = MAX_OTP_ATTEMPTS - (attempts + 1);
    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      remainingAttempts,
      ...(remainingAttempts === 0 && {
        note: "You've used all 3 attempts. Next OTP can be requested after 50 seconds",
      }),
      otp,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
//saveFCM token when phone otp varified
export const saveFcmToken = async (req, res) => {
  const userId = req.user.id;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }
  await VendorProfile.findByIdAndUpdate(userId, { fcmToken });

  const cacheKey = `vendor:v1:${JSON.stringify({})}`;
  await RedisCache.delete(cacheKey);
  res.status(200).json({ message: "FCM token saved" });
};
//vendorProfile
export const upsertVendorInfo = async (req, res) => {
  try {
    const vendorProfileId = req.user.id;
    const { firstName, lastName, email, governmentIdNumber, governmentIdType } =
      req.body;

    if (!req.files || !req.files.uploadId) {
      return res.status(400).json({
        success: false,
        error: "Upload ID document is required",
      });
    }

    const uploadIdPaths = req.files.uploadId.map((file) => file.location);

    const otp = 1234; //For testing purposes, replace with generateOtp() in production
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);

    const aadharOtpData = {
      codeHash: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 1,
      lastSentAt: new Date(),
    };

    const vendorProfileInfo = await VendorProfile.findByIdAndUpdate(
      vendorProfileId,
      {
        $set: {
          uploadId: uploadIdPaths,
          aadharOtp: aadharOtpData,
          firstName,
          lastName,
          email,
          governmentIdNumber,
          governmentIdType,
        },
      },
      { new: true },
    );
    const cacheKey = `vendor:v1:${JSON.stringify({})}`;
    await RedisCache.delete(cacheKey);
    return res.status(200).json({
      success: true,
      message: "Vendor details saved successfully",
      data: vendorProfileInfo,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};

//vendor profile with company details
export const getVendorProfile = async (req, res, next) => {
  try {
    const cacheKey = `vendor:v1:${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.json(cached);

    const vendorId = req.user.id;
    // const { vendorId } = req.params; testing
    const vendor = await VendorCompany.findOne({ vendorId: vendorId })
      .populate({
        path: "vendorId",
        select:
          "-password -phoneOtp -aadharOtp -ratingBreakdown -totalReviews -avgRating -recommendationPercentage -__v",
      })
      .select("-__v")
      .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    await RedisCache.set(cacheKey, vendor);
    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUpsertVendorInfo = async (req, res) => {
  try {
    const vendorProfileId = req.user.id;
    const {
      firstName,
      lastName,
      email,
      governmentIdNumber,
      governmentIdType,
      moduleId,
    } = req.body;

    const updateFields = {};
    if (moduleId) updateFields.moduleId = moduleId;
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (governmentIdNumber)
      updateFields.governmentIdNumber = governmentIdNumber;
    if (governmentIdType) updateFields.governmentIdType = governmentIdType;

    if (req.files && req.files.uploadId) {
      updateFields.uploadId = req.files.uploadId.map((file) => file.location);
    }

    const vendorProfileInfo = await VendorProfile.findByIdAndUpdate(
      vendorProfileId,
      { $set: updateFields },
      { new: true, select: "-aadharOtp -phoneOtp" },
    );

    const cacheKey = `vendor:v1:${JSON.stringify({})}`;
    await RedisCache.delete(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Vendor details updated successfully",
      data: vendorProfileInfo,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
//login
export const loginWithPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }
    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error,
      });
    }

    const validatedPhone = phoneValidation.normalized;

    const user = await VendorProfile.findOne({ phoneNumber: validatedPhone });

    if (!user || !user.isAdminVerified) {
      return res.status(404).json({
        success: false,
        error: "User not found. Please register first.",
      });
    }
    const now = new Date();
    let attempts = user.phoneOtp?.attempts || 0;
    const lastSentAt = user.phoneOtp?.lastSentAt
      ? new Date(user.phoneOtp.lastSentAt)
      : null;

    if (attempts >= MAX_OTP_ATTEMPTS && lastSentAt) {
      const diff = now - lastSentAt;

      if (diff < COOLDOWN_PERIOD) {
        const waitTime = Math.ceil((COOLDOWN_PERIOD - diff) / 1000);
        return res.status(429).json({
          success: false,
          error: `OTP limit reached. Please wait ${waitTime} seconds`,
        });
      }

      attempts = 0;
    }

    // const otp = generateOtp();
    const otp = 1234; // For testing purposes, replace with generateOtp() in production
    const hashedOtp = await bcrypt.hash(String(otp), 10);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // setImmediate(() => {
    //   sendOtpViaMSG91(validatedPhone, otp).catch(() => {});
    // });

    user.phoneOtp = {
      codeHash: hashedOtp,
      expiresAt,
      attempts: attempts + 1,
      lastSentAt: now,
    };

    await user.save();
    const remainingAttempts = MAX_OTP_ATTEMPTS - (attempts + 1);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      remainingAttempts,
      ...(remainingAttempts === 0 && {
        note: "OTP limit reached. Try again after cooldown.",
      }),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
export const logoutVendor = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await VendorProfile.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // invalidate token
    user.token = null;
    await user.save();
    const cacheKey = `vendor:v1:${JSON.stringify({})}`;
    await RedisCache.delete(cacheKey);
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

export const upsertVendorCompanyInfo = async (req, res) => {
  try {
    if (req.body.bankDetails && typeof req.body.bankDetails === "string") {
      try {
        req.body.bankDetails = JSON.parse(req.body.bankDetails);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid bankDetails JSON",
        });
      }
    }

    const { vendorId, bankDetails, ...companyData } = req.body;

    if (req.files) {
      if (req.files.shopImages) {
        companyData.shopImages = req.files.shopImages.map(
          (file) => file.location,
        );
      }

      if (req.files.certificates) {
        companyData.certificates = req.files.certificates.map(
          (file) => file.location,
        );
      }
    }

    const company = await VendorCompany.create({
      vendorId,
      ...companyData,
    });

    if (bankDetails) {
      const {
        accountHolderName,
        accountNumber,
        confirmAccountNumber,
        ifscCode,
        bankName,
        accountType,
        upiId,
      } = bankDetails;

      if (accountNumber !== confirmAccountNumber) {
        return res.status(400).json({
          success: false,
          message: "Account number mismatch",
        });
      }

      let cancelledChequeUrl = "";
      if (req.files?.cancelledCheque) {
        cancelledChequeUrl = req.files.cancelledCheque[0].location;
      }

      const existingBank = await VendorBankAccount.findOne({ vendorId });

      await VendorBankAccount.create({
        vendorId,
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
        accountType,
        upiId,
        cancelledCheque: cancelledChequeUrl,
        isDefault: existingBank ? false : true,
      });
    }

    await VendorProfile.findByIdAndUpdate(vendorId, {
      isProfileCompleted: true,
    });

    return res.status(200).json({
      success: true,
      message: "Company & Bank saved successfully",
      data: company,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};

export const updateUpsertVendorCompanyInfo = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { ...companyData } = req.body;

    if (req.files) {
      if (req.files.shopImages) {
        companyData.shopImages = req.files.shopImages.map(
          (file) => file.location,
        );
      }
      if (req.files.certificates) {
        companyData.certificates = req.files.certificates.map(
          (file) => file.location,
        );
      }
      if (req.files.cancelledCheque) {
        companyData.cancelledCheque = req.files.cancelledCheque[0].location;
      }
    }

    const updatedCompany = await VendorCompany.findOneAndUpdate(
      { vendorId },
      { $set: companyData },
      { new: true, upsert: true },
    );

    await VendorProfile.findByIdAndUpdate(vendorId, {
      $set: { isProfileCompleted: true },
    });
    const cacheKey = `vendor:v1:${JSON.stringify({})}`;
    await RedisCache.delete(cacheKey);
    return res.status(200).json({
      success: true,
      message: "Company details saved successfully",
      data: updatedCompany,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
//admin access functions
export const getAllVendors = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const { search, isAdminVerified, sort, disable } = req.query;

    const cacheKey = `vendors:all:v1:${JSON.stringify({ page, limit, search, isAdminVerified, sort, disable })}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeSearch = search ? escapeRegex(search) : null;

    // ---------------- Vendor (User) Search ----------------
    const vendorUserQuery = {};

    if (safeSearch) {
      vendorUserQuery.$or = [
        { firstName: { $regex: safeSearch, $options: "i" } },
        { lastName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { phoneNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (isAdminVerified !== undefined) {
      vendorUserQuery.isAdminVerified = isAdminVerified === "true";
    }

    if (disable !== undefined) {
      vendorUserQuery.disable = disable === "true";
    }
    // ---------------- Fetch matching Vendor IDs ----------------
    let vendorIds = [];
    if (Object.keys(vendorUserQuery).length > 0) {
      const vendors = await VendorProfile.find(vendorUserQuery).select("_id");
      vendorIds = vendors.map((v) => v._id);

      if (
        (disable !== undefined || isAdminVerified !== undefined) &&
        vendorIds.length === 0
      ) {
        return res.status(200).json({
          success: true,
          pagination: { total: 0, page, limit, totalPages: 0 },
          data: [],
        });
      }
    }
    const query = {};
    if (safeSearch) {
      query.$or = [{ companyName: { $regex: safeSearch, $options: "i" } }];

      if (vendorIds.length > 0) {
        query.$or.push({ vendorId: { $in: vendorIds } });
      }
    } else if (vendorIds.length > 0) {
      query.vendorId = { $in: vendorIds };
    } else if (isAdminVerified !== undefined) {
      return res.status(200).json({
        success: true,
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        data: [],
      });
    }

    // ---------------- Sorting ----------------
    let sortQuery = { createdAt: -1 };
    if (sort === "oldest") {
      sortQuery = { createdAt: 1 };
    }

    // ---------------- DB Queries ----------------
    const [vendors, total] = await Promise.all([
      VendorCompany.find(query)
        .populate({
          path: "vendorId",
          select: "-password -phoneOtp -aadharOtp -__v",
        })
        .sort(sortQuery)
        .skip(skip)
        .limit(limit),
      VendorCompany.countDocuments(query),
    ]);

    // ---------------- Response ----------------
    const response = {
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: vendors.map((v) => ({
        _id: v._id,
        shopName: v.companyName, // ye hi shop name hai
        companyType: v.companyType,
        badges: v.badges || [],
        totalReviews: v.vendorId?.totalReviews || 0,
        businessCategory: v.businessCategory,
        vendor: {
          _id: v.vendorId?._id,
          name: `${v.vendorId?.firstName || ""} ${v.vendorId?.lastName || ""}`,
          email: v.vendorId?.email,
          phoneNumber: v.vendorId?.phoneNumber,
          isAdminVerified: v.vendorId?.isAdminVerified,
          isDisabled: v.vendorId?.disable,
        },

        location: {
          address: v.businessAddress?.address,
        },

        createdAt: v.createdAt,
      })),
    };
    await RedisCache.set(cacheKey, response);
    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: vendors,
    });
  } catch (error) {
    console.error("Get Vendors Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//users get all vendor company vadetails with filter and pagination for admin panel
export const getAllVendorCompany = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const { search, sort } = req.query;

    const cacheKey = `vendorCompany:all:v2:${JSON.stringify({
      page,
      limit,
      search,
      sort,
    })}`;

    const cached = await RedisCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeSearch = search ? escapeRegex(search) : null;

    // ------------------------------------------------
    // Step 1: Only verified + enabled vendors allowed
    // ------------------------------------------------
    const allowedVendors = await VendorProfile.find({
      isAdminVerified: true,
      disable: false,
    }).select("_id");

    const vendorIds = allowedVendors.map((v) => v._id);

    if (!vendorIds.length) {
      return res.status(200).json({
        success: true,
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        data: [],
      });
    }

    // ------------------------------------------------
    // Step 2: VendorCompany Query
    // ------------------------------------------------
    const query = {
      vendorId: { $in: vendorIds },
    };

    if (safeSearch) {
      query.$or = [
        { companyName: { $regex: safeSearch, $options: "i" } },
        { companyType: { $regex: safeSearch, $options: "i" } },
        { businessCategory: { $regex: safeSearch, $options: "i" } },
        {
          "businessAddress.address": {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    // ------------------------------------------------
    // Step 3: Sorting
    // ------------------------------------------------
    let sortQuery = { createdAt: -1 };

    if (sort === "oldest") {
      sortQuery = { createdAt: 1 };
    }

    // ------------------------------------------------
    // Step 4: Fetch Data
    // ------------------------------------------------
    const [vendorCompanies, total] = await Promise.all([
      VendorCompany.find(query)
        .populate({
          path: "vendorId",
          select:
            "firstName lastName email phoneNumber isAdminVerified disable totalReviews",
        })
        .sort(sortQuery)
        .skip(skip)
        .limit(limit),

      VendorCompany.countDocuments(query),
    ]);

    // ------------------------------------------------
    // Step 5: Response
    // ------------------------------------------------
    const response = {
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: vendorCompanies.map((v) => ({
        _id: v._id,

        shopName: v.companyName,
        companyType: v.companyType,
        businessCategory: v.businessCategory,
        badges: v.badges || [],
        shopImages: v.shopImages || [],
        certificates: v.certificates || [],
        totalReviews: v.vendorId?.totalReviews || 0,

        vendor: {
          _id: v.vendorId?._id,
          name: `${v.vendorId?.firstName || ""} ${
            v.vendorId?.lastName || ""
          }`.trim(),
          email: v.vendorId?.email,
          phoneNumber: v.vendorId?.phoneNumber,

          // always true/false based on allowed filter
          isAdminVerified: v.vendorId?.isAdminVerified,
          isDisabled: v.vendorId?.disable,
        },

        location: {
          address: v.businessAddress?.address || "",
        },

        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    };

    await RedisCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get All VendorCompany Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllVendorsViaModuleId = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;
    const moduleId = req.params.moduleId;
    const { search, isAdminVerified, disable, sort } = req.query;

    const cacheKey = `vendors:module:v1:${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.json(cached);

    const matchVendor = {};

    // ---------------- MODULE FILTER ----------------
    // if (moduleId) {
    //   matchVendor.moduleId = new mongoose.Types.ObjectId(moduleId);
    // }

    if (isAdminVerified !== undefined) {
      matchVendor.isAdminVerified = isAdminVerified === "true";
    }

    if (disable !== undefined) {
      matchVendor.disable = disable === "true";
    }

    if (search) {
      matchVendor.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    let sortStage = { createdAt: -1 };
    if (sort === "oldest") sortStage = { createdAt: 1 };

    // ---------------- PIPELINE ----------------
    const pipeline = [
      { $match: { moduleId: new mongoose.Types.ObjectId(moduleId) } },
      // 2️ JOIN VENDOR COMPANY
      {
        $lookup: {
          from: "vendorcompanies",
          localField: "_id",
          foreignField: "vendorId",
          as: "vendorCompany",
        },
      },
      {
        $unwind: {
          path: "$vendorCompany",
          preserveNullAndEmptyArrays: true,
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    "vendorCompany.companyName": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),

      { $sort: sortStage },

      { $skip: skip },
      { $limit: limit },

      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          phoneNumber: 1,
          isAdminVerified: 1,
          disable: 1,
          moduleId: 1,
          createdAt: 1,

          vendorCompany: {
            companyName: 1,
            companyType: 1,
            businessCategory: 1,
            badges: 1,
            businessAddress: 1,
            shopImages: 1,
          },
        },
      },
    ];

    const [vendors, total] = await Promise.all([
      VendorProfile.aggregate(pipeline),
      VendorProfile.countDocuments(matchVendor),
    ]);

    const response = {
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: vendors,
    };

    await RedisCache.set(cacheKey, response, 30);

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUnverifiedVendors = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const filter = {
      isAdminVerified: false,
    };

    if (search) {
      filter.$or = [
        { shopName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      VendorProfile.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      VendorProfile.countDocuments(filter),
    ]);

    const formattedVendors = vendors.map((v) => ({
      vendorId: v._id,
      name: `${v.firstName} ${v.lastName}`,
      email: v.email,
      phoneNumber: v.phoneNumber,
      isAdminVerified: v.isAdminVerified,
      isAadharVerified: v.isAadharVerified,
      isProfileCompleted: v.isProfileCompleted,
      isActive: !v.disable,

      createdAt: v.createdAt,
    }));

    const response = {
      success: true,
      message: "Unverified vendors fetched successfully",
      data: formattedVendors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(APIError(500, error.message));
  }
};

//admin verify vendor
export const verifyVendorByAdmin = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    // Check vendor exists
    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return next(APIError(403, "Vendor is not admin verified"));
    }

    // Already verified
    if (vendor.isAdminVerified === true) {
      return res.status(200).json({
        success: true,
        message: "Vendor already admin verified",
      });
    }

    // Update admin verification
    vendor.isAdminVerified = true;
    await vendor.save();
    // await RedisCache.delete(`vendor:v1:${vendorId}:*`);
    await Promise.all([
      RedisCache.delete(`vendor:v1:${vendorId}:*`),
      RedisCache.delete(`vendor:${vendorId}`), // single vendor
      RedisCache.delete(`vendor:id:v1:${vendorId}`), // vendor detail cache
      RedisCache.deletePattern("vendors:all:v1:*"), // all list caches
      RedisCache.deletePattern("vendorCompany:all:v2:*"), // all list caches
    ]);
    return res.status(200).json({
      success: true,
      message: "Vendor admin verified successfully",
      data: {
        vendorId: vendor._id,
        isAdminVerified: vendor.isAdminVerified,
      },
    });
  } catch (error) {
    next(APIError(500, error.message));
  }
};

export const addMultipleBadgesByAdmin = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { badges } = req.body;

    if (!Array.isArray(badges) || badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Badges array is required",
      });
    }
    const vendor = await VendorCompany.findOneAndUpdate(
      { vendorId },
      {
        $addToSet: {
          badges: { $each: badges },
        },
      },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await Promise.all([
      RedisCache.delete(`vendor:${vendorId}`), // single vendor
      RedisCache.delete(`vendor:id:v1:${vendorId}`), // vendor detail cache
      RedisCache.deletePattern("vendors:all:v1:*"), // all list caches
    ]);
    return res.status(200).json({
      success: true,
      message: "Badges added successfully",
      data: vendor.badges,
    });
  } catch (error) {
    next(error);
  }
};
export const removeMultipleBadgesByAdmin = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { badges } = req.body;

    if (!Array.isArray(badges) || badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Badges array is required",
      });
    }

    const vendor = await VendorCompany.findOneAndUpdate(
      { vendorId },
      {
        $pull: {
          badges: { $in: badges },
        },
      },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    // await RedisCache.delete(`vendor:id:v1:${vendorId}`);
    // await RedisCache.delete("vendors:all:v1:*");
    // await RedisCache.deletePattern("vendors:all:v1:*");
    await Promise.all([
      RedisCache.delete(`vendor:${vendorId}`), // single vendor
      RedisCache.delete(`vendor:id:v1:${vendorId}`), // vendor detail cache
      RedisCache.deletePattern("vendors:all:v1:*"), // all list caches
    ]);
    return res.status(200).json({
      success: true,
      message: "Badges removed successfully",
      data: vendor.badges,
    });
  } catch (error) {
    next(error);
  }
};
//eneble/disable vendor profile
// export const disableVendorStatus = async (req, res, next) => {
//   try {
//     const { vendorId } = req.params;
//     const vendor = await VendorProfile.findById(vendorId);

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found",
//       });
//     }
//     vendor.disable = !vendor.disable;
//     await vendor.save();
//     // await RedisCache.delete(`vendor:id:v1:${vendorId}`);
//     // await RedisCache.delete("vendors:all:v1:*");
//     // await RedisCache.deletePattern("vendors:all:v1:*");

//     await Promise.all([
//       RedisCache.delete(`vendor:${vendorId}`), // single vendor
//       RedisCache.delete(`vendor:id:v1:${vendorId}`), // vendor detail cache
//       RedisCache.deletePattern("vendors:all:v1:*"), // all list caches
//       RedisCache.deletePattern("vendorCompany:all:v2:*"), // all list caches
//     ]);
//     return res.status(200).json({
//       success: true,
//       message: `Vendor status disable ${vendor.disable ? "true" : "false"}`,
//       data: {
//         name: `${vendor.firstName} ${vendor.lastName}`,
//         phoneNumber: vendor.phoneNumber,
//         email: vendor.email,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const disableVendorStatus = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // toggle vendor status
    vendor.disable = !vendor.disable;

    await vendor.save();

    // ======================================================
    // Disable/Enable all products of this vendor
    // ======================================================

    await Product.updateMany(
      { vendorId: vendor._id },
      {
        $set: {
          disable: vendor.disable,
        },
      },
    );

    // ======================================================
    // CLEAR CACHE
    // ======================================================

    await Promise.all([
      RedisCache.delete(`vendor:${vendorId}`),
      RedisCache.delete(`vendor:id:v1:${vendorId}`),
      RedisCache.deletePattern("vendors:all:v1:*"),
      RedisCache.deletePattern("vendorCompany:all:v2:*"),
      // product cache bhi clear kr do
      RedisCache.deletePattern("products:*"),
    ]);

    return res.status(200).json({
      success: true,
      message: `Vendor status changed to ${vendor.disable}`,
      data: {
        name: `${vendor.firstName} ${vendor.lastName}`,
        phoneNumber: vendor.phoneNumber,
        email: vendor.email,
        vendorDisabled: vendor.disable,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoriesByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { type } = req.query;

    if (!vendorId || !type) {
      return res.status(400).json({
        success: false,
        message: "vendorId and type required",
      });
    }

    const categories = await productModel.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          disable: false,
        },
      },

      // ✅ SAME LOGIC AS PRODUCT API
      {
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                disable: false,

                // ✅ TYPE FILTER
                Type: { $regex: `^${type}$`, $options: "i" },
              },
            },
            { $limit: 1 },
          ],
          as: "variant",
        },
      },

      // only those products jisme variant mila
      {
        $match: {
          variant: { $ne: [] },
        },
      },

      // ✅ group category
      {
        $group: {
          _id: "$categoryId",
          productCount: { $sum: 1 },
        },
      },

      // ✅ category details
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $project: {
          _id: 0,
          id: "$category._id",
          name: "$category.name",
          image: "$category.image",
          productCount: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error",
    });
  }
};

//whole response data
// export const getProductsByVendorAndCategory = async (req, res, next) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       sort,
//       search,
//       type,
//       minPrice,
//       maxPrice,
//     } = req.query;

//     const { vendorId, categoryId } = req.params;

//     // ✅ validation
//     if (!vendorId || !categoryId) {
//       return res.status(400).json({
//         success: false,
//         message: "vendorId and categoryId required",
//       });
//     }

//     if (!type || !["BULK", "RETAIL"].includes(type.toUpperCase())) {
//       return res.status(400).json({
//         success: false,
//         message: "Type must be BULK or RETAIL",
//       });
//     }

//     const pageNum = Number(page);
//     const limitNum = Number(limit);
//     const skip = (pageNum - 1) * limitNum;

//     const pipeline = [];

//     // ✅ base match
//     const matchStage = {
//       vendorId: new mongoose.Types.ObjectId(vendorId),
//       categoryId: new mongoose.Types.ObjectId(categoryId),
//       disable: false,
//     };

//     // ✅ search
//     if (search) {
//       matchStage.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { slug: { $regex: search, $options: "i" } },
//       ];
//     }

//     pipeline.push({ $match: matchStage });

//     // ✅ variant lookup (MAIN LOGIC)
//     pipeline.push({
//       $lookup: {
//         from: "variants",
//         let: { productId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: { $eq: ["$productId", "$$productId"] },
//               disable: false,

//               // ✅ TYPE FILTER
//               Type: { $regex: `^${type}$`, $options: "i" },

//               ...(minPrice || maxPrice
//                 ? {
//                     price: {
//                       ...(minPrice && { $gte: Number(minPrice) }),
//                       ...(maxPrice && { $lte: Number(maxPrice) }),
//                     },
//                   }
//                 : {}),
//             },
//           },
//           { $sort: { price: 1 } },
//           { $limit: 1 },
//         ],
//         as: "variant",
//       },
//     });

//     // ✅ keep only valid products
//     pipeline.push({
//       $match: {
//         variant: { $ne: [] },
//       },
//     });

//     // ✅ convert to object
//     pipeline.push({
//       $addFields: {
//         defaultVariant: { $arrayElemAt: ["$variant", 0] },
//       },
//     });

//     // ================= SORT =================
//     pipeline.push({
//       $sort:
//         sort === "priceLowHigh"
//           ? { "defaultVariant.price": 1 }
//           : sort === "priceHighLow"
//             ? { "defaultVariant.price": -1 }
//             : sort === "oldest"
//               ? { createdAt: 1 }
//               : { createdAt: -1 }, // newest default
//     });

//     // ================= PAGINATION =================
//     pipeline.push({
//       $facet: {
//         products: [{ $skip: skip }, { $limit: limitNum }],
//         totalCount: [{ $count: "count" }],
//       },
//     });

//     // ================= FORMAT =================
//     pipeline.push({
//       $addFields: {
//         totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
//       },
//     });

//     pipeline.push({ $unwind: "$products" });

//     // brand lookup (optional)
//     pipeline.push({
//       $lookup: {
//         from: "brands",
//         localField: "products.brandId",
//         foreignField: "_id",
//         pipeline: [{ $project: { name: 1 } }],
//         as: "products.brandId",
//       },
//     });

//     pipeline.push({
//       $unwind: {
//         path: "$products.brandId",
//         preserveNullAndEmptyArrays: true,
//       },
//     });

//     pipeline.push({
//       $group: {
//         _id: null,
//         products: { $push: "$products" },
//         totalCount: { $first: "$totalCount" },
//       },
//     });

//     // ================= EXECUTE =================
//     const result = await Product.aggregate(pipeline);

//     const products = result[0]?.products || [];
//     const total = result[0]?.totalCount || 0;

//     return res.status(200).json({
//       success: true,
//       message: "Products fetched successfully",
//       results: products.length,
//       total,
//       page: pageNum,
//       totalPages: Math.ceil(total / limitNum),
//       data: { products },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

//optmize respose data
export const getProductsByVendorAndCategory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      search,
      type,
      minPrice,
      maxPrice,
    } = req.query;

    const { vendorId, categoryId } = req.params;

    if (!vendorId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "vendorId and categoryId required",
      });
    }

    if (!type || !["BULK", "RETAIL"].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Type must be BULK or RETAIL",
      });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [];

    // ================= BASE MATCH =================
    const matchStage = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      categoryId: new mongoose.Types.ObjectId(categoryId),
      disable: false,
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    pipeline.push({ $match: matchStage });

    // ================= VARIANT LOOKUP =================
    pipeline.push({
      $lookup: {
        from: "variants",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$productId"] },
              disable: false,
              Type: { $regex: `^${type}$`, $options: "i" },

              ...(minPrice || maxPrice
                ? {
                    price: {
                      ...(minPrice && { $gte: Number(minPrice) }),
                      ...(maxPrice && { $lte: Number(maxPrice) }),
                    },
                  }
                : {}),
            },
          },
          { $sort: { price: 1 } },
          { $limit: 1 },
        ],
        as: "variant",
      },
    });

    // ================= FILTER VALID PRODUCTS =================
    pipeline.push({
      $match: {
        variant: { $ne: [] },
      },
    });

    // ================= MAKE defaultVariant =================
    pipeline.push({
      $addFields: {
        defaultVariant: { $arrayElemAt: ["$variant", 0] },
      },
    });

    // ================= SORT =================
    pipeline.push({
      $sort:
        sort === "priceLowHigh"
          ? { "defaultVariant.price": 1 }
          : sort === "priceHighLow"
            ? { "defaultVariant.price": -1 }
            : sort === "oldest"
              ? { createdAt: 1 }
              : { createdAt: -1 },
    });

    // ================= PAGINATION =================
    pipeline.push({
      $facet: {
        products: [{ $skip: skip }, { $limit: limitNum }],
        totalCount: [{ $count: "count" }],
      },
    });

    // ================= FORMAT =================
    pipeline.push({
      $addFields: {
        totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
      },
    });

    pipeline.push({ $unwind: "$products" });

    // ================= BRAND LOOKUP =================
    pipeline.push({
      $lookup: {
        from: "brands",
        localField: "products.brandId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "products.brandId",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$products.brandId",
        preserveNullAndEmptyArrays: true,
      },
    });

    // ================= CLEAN RESPONSE =================
    pipeline.push({
      $project: {
        _id: 0,
        product: {
          _id: "$products._id",
          name: "$products.name",
          slug: "$products.slug",
          images: "$products.images",
          thumbnail: "$products.thumbnail",
          avgRating: "$products.avgRating",
          reviewCount: "$products.reviewCount",
          sold: "$products.sold",
          brand: "$products.brandId.name",

          defaultVariant: {
            price: "$products.defaultVariant.price",
            mrp: "$products.defaultVariant.mrp",
            discount: "$products.defaultVariant.discount",
            Type: "$products.defaultVariant.Type",
          },

          createdAt: "$products.createdAt",
        },
        totalCount: 1,
      },
    });

    pipeline.push({
      $group: {
        _id: null,
        products: { $push: "$product" },
        totalCount: { $first: "$totalCount" },
      },
    });

    // ================= EXECUTE =================
    const result = await Product.aggregate(pipeline);

    const products = result[0]?.products || [];
    const total = result[0]?.totalCount || 0;

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      results: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};
export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No refresh token",
      });
    }

    // verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      );
    } catch {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // DB check
    const stored = await refreshTokenModel.findOne({
      token: refreshToken,
    });

    if (!stored || stored.isRevoked) {
      return res.status(401).json({
        message: "Token revoked",
      });
    }

    //  rotation (recommended)
    stored.isRevoked = true;
    await stored.save();

    const newRefreshToken = jwt.sign(
      { id: decoded.id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
    );

    await refreshTokenModel.create({
      vendorId: decoded.id,
      token: newRefreshToken,
      deviceId: stored.deviceId,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const newAccessToken = jwt.sign(
      { id: decoded.id, role: "vendor" },
      process.env.JWT_SECRET,
      { expiresIn: "30m" },
    );

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

// import VendorCompany from "../../models/vendor/vendorCompany.model.js";
import Product from "../../models/vendorShop/product.model.js";
import Order from "../../models/marketPlace/order.model.js";
import VendorWallet from "../../models/vendorShop/vendorWallet.model.js";

//without top product array
// export const getVendorById = async (req, res) => {
//   try {
//     const { vendorId } = req.params;

//     const cacheKey = `vendor:id:v4:${vendorId}`; // version updated
//     const cached = await RedisCache.get(cacheKey);
//     if (cached) return res.status(200).json(cached);

//     // Vendor Info
//     const vendor = await VendorCompany.findOne({ vendorId })
//       .populate({
//         path: "vendorId",
//         select: "-password -phoneOtp -aadharOtp -__v",
//       })
//       .lean();

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found",
//       });
//     }

//     // 🚀 Parallel execution
//     const [totalProducts, orderStats, wallet, topProducts] = await Promise.all([
//       //  Total Products
//       Product.countDocuments({ vendorId }),

//       // Order Stats
//       Order.aggregate([
//         { $match: { vendorId } },
//         {
//           $group: {
//             _id: "$orderStatus",
//             count: { $sum: 1 },
//           },
//         },
//       ]),

//       // Wallet
//       VendorWallet.findOne({ vendorId }).lean(),

//       // Top 10 Products (Most Ordered)
//       Order.aggregate([
//         { $match: { vendorId } },
//         { $unwind: "$products" },
//         {
//           $group: {
//             _id: "$products.productId",
//             totalOrders: { $sum: "$products.quantity" }, // quantity based (best)
//           },
//         },
//         { $sort: { totalOrders: -1 } },
//         { $limit: 10 },
//         {
//           $lookup: {
//             from: "products", // check collection name
//             localField: "_id",
//             foreignField: "_id",
//             as: "productDetails",
//           },
//         },
//         { $unwind: "$productDetails" },
//         {
//           $project: {
//             _id: 0,
//             productId: "$_id",
//             totalOrders: 1,
//             name: "$productDetails.name",
//             price: "$productDetails.price",
//             images: "$productDetails.images",
//           },
//         },
//       ]),
//     ]);

//     // ✅ Format Order Stats
//     let completedOrders = 0;
//     let pendingOrders = 0;

//     orderStats.forEach((item) => {
//       if (item._id === "completed") completedOrders = item.count;
//       if (item._id === "pending") pendingOrders = item.count;
//     });

//     // ✅ Analytics Object
//     const analytics = {
//       totalProducts,
//       totalOrders: completedOrders + pendingOrders,
//       completedOrders,
//       pendingOrders,
//       wallet: {
//         totalBalance: wallet?.totalBalance || 0,
//         availableBalance: wallet?.availableBalance || 0,
//         onHoldBalance: wallet?.onHoldBalance || 0,
//       },
//     };

//     // ✅ Final Response
//     const response = {
//       success: true,
//       data: {
//         ...vendor,
//         analytics,
//         topProducts, //  only top 10
//       },
//     };

//     // ✅ Cache set
//     await RedisCache.set(cacheKey, response);

//     return res.status(200).json(response);
//   } catch (error) {
//     console.error("Get Vendor Error:", error);
//     return res.status(400).json({
//       success: false,
//       message: "Invalid vendor ID",
//     });
//   }
// };
export const getVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const cacheKey = `vendor:id:v1:${vendorId}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const vendor = await VendorCompany.findOne({ vendorId })
      .populate({
        path: "vendorId",
        select: "-password -phoneOtp -aadharOtp -__v",
      })
      .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const [totalProducts, orderStats, wallet] = await Promise.all([
      Product.countDocuments({ vendorId }),

      Order.aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ]),

      VendorWallet.findOne({ vendorId }).lean(),
    ]);

    let topProducts = await Order.aggregate([
      { $match: { vendorId } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalOrders: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products", // confirm collection name
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          totalOrders: 1,
          name: "$productDetails.name",
          price: "$productDetails.price",
          images: "$productDetails.images",
        },
      },
    ]);

    if (!topProducts || topProducts.length === 0) {
      const fallbackProducts = await Product.find({ vendorId })
        .sort({ createdAt: -1 }) // latest products
        .limit(2)
        .select("name price images")
        .lean();

      topProducts = fallbackProducts.map((p) => ({
        productId: p._id,
        name: p.name,
        price: p.price,
        images: p.images,
        totalOrders: 0,
      }));
    }

    let completedOrders = 0;
    let pendingOrders = 0;

    orderStats.forEach((item) => {
      if (item._id === "completed") completedOrders = item.count;
      if (item._id === "pending") pendingOrders = item.count;
    });

    const analytics = {
      totalProducts,
      totalOrders: completedOrders + pendingOrders,
      completedOrders,
      pendingOrders,
      wallet: {
        totalBalance: wallet?.totalBalance || 0,
        availableBalance: wallet?.availableBalance || 0,
        onHoldBalance: wallet?.onHoldBalance || 0,
      },
    };

    const response = {
      success: true,
      data: {
        ...vendor,
        analytics,
        topProducts,
      },
    };

    await RedisCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get Vendor Error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid vendor ID",
    });
  }
};

export const getVendorByIdForUser = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const cacheKey = `vendor:id:v3:${vendorId}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const vendor = await VendorCompany.findOne({ vendorId })
      .populate({
        path: "vendorId",
        select: "-password -phoneOtp -aadharOtp -__v",
      })
      .select("-__v") // __v remove
      .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    delete vendor.accountHolderName;
    delete vendor.bankName;
    delete vendor.accountNumber;
    delete vendor.confirmAccountNumber;
    delete vendor.ifscCode;
    delete vendor.accountType;
    delete vendor.upiId;
    delete vendor.cancelledCheque;
    delete vendor.serviceArea;

    // analytics remove
    // topProducts remove

    const response = {
      success: true,
      data: vendor,
    };

    await RedisCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get Vendor Error:", error);

    return res.status(400).json({
      success: false,
      message: "Invalid vendor ID",
    });
  }
};

export const getSimilarCompanies = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // fixed limit = 10
    const limit = 10;

    const cacheKey = `similarCompanies:${vendorId}:limit:${limit}`;
    const cached = await RedisCache.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    // Current vendor company find
    const currentCompany = await VendorCompany.findOne({ vendorId }).select(
      "businessCategory companyType vendorId",
    );

    if (!currentCompany) {
      return res.status(404).json({
        success: false,
        message: "Vendor company not found",
      });
    }

    // Similar companies based on businessCategory + companyType
    const similarCompanies = await VendorCompany.find({
      _id: { $ne: currentCompany._id },
      vendorId: { $ne: vendorId },
      businessCategory: currentCompany.businessCategory,
      companyType: currentCompany.companyType,
    })
      .populate({
        path: "vendorId",
        match: {
          isAdminVerified: true,
          disable: false,
        },
        select: "firstName lastName email phoneNumber isAdminVerified disable",
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // null populated vendor remove
    const filteredCompanies = similarCompanies.filter((item) => item.vendorId);

    const response = {
      success: true,
      total: filteredCompanies.length,
      data: filteredCompanies.map((v) => ({
        _id: v._id,
        shopName: v.companyName,
        companyType: v.companyType,
        businessCategory: v.businessCategory,
        badges: v.badges || [],
        shopImages: v.shopImages || [],

        vendor: {
          _id: v.vendorId?._id,
          name: `${v.vendorId?.firstName || ""} ${
            v.vendorId?.lastName || ""
          }`.trim(),
          email: v.vendorId?.email,
          phoneNumber: v.vendorId?.phoneNumber,
        },

        location: {
          address: v.businessAddress?.address || "",
        },

        createdAt: v.createdAt,
      })),
    };

    await RedisCache.set(cacheKey, response);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get Similar Companies Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//dynamic-otp
const generateOtp = () => {
  return Number(
    otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    }),
  );
};
const sendOtpViaMSG91 = (mobile, otp) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      hostname: process.env.MSG91_HOST,
      path: process.env.MSG91_FLOW_PATH,
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "content-type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error?.message || "MSG91 API error"));
          }
        } catch {
          reject(new Error("Failed to parse MSG91 response"));
        }
      });
    });

    req.on("error", reject);
    const body = JSON.stringify({
      flow_id: process.env.MSG91_FLOW_ID,
      sender: process.env.MSG91_SENDER,
      mobiles: `${process.env.MSG91_COUNTRY_CODE}${mobile}`,
      otp: String(otp),
    });

    req.write(body);
    req.end();
  });
};
const validatePhone = (phone) => {
  if (!phone && phone !== 0)
    return { valid: false, error: "Phone number is required" };

  const phoneStr = String(phone);
  const cleaned = phoneStr.replace(/[\s\-\(\)]/g, "");
  const indianRegex = /^(\+91|91)?[6-9]\d{9}$/;
  if (!indianRegex.test(cleaned)) {
    return {
      valid: false,
      error:
        "Invalid phone number. Please enter a valid 10-digit Indian mobile number",
    };
  }

  let normalized = cleaned;
  if (cleaned.length === 13 && cleaned.startsWith("+91")) {
    normalized = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    normalized = cleaned.slice(2);
  }
  return { valid: true, normalized };
};

//pending
const assignAutoBadges = async (vendor) => {
  const badges = new Set(vendor.badges || []);
  if (vendor.totalOrders >= 500) badges.add("MOST_SOLD");
  if (vendor.averageDeliveryTime <= 24) badges.add("FAST_DELIVERY");
  if (vendor.avgRating >= 4.5) badges.add("TOP_VENDOR");
  if (vendor.pastQualityDisputes === false) badges.add("TRUSTED_SELLER");

  if (
    badges.has("MOST_SOLD") &&
    badges.has("FAST_DELIVERY") &&
    vendor.rating >= 4.5
  ) {
    badges.add("TOP_VENDOR");
  }

  vendor.badges = Array.from(badges);
};
