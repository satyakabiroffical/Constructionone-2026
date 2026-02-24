//asgr
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
import productModel from "../../models/vendorShop/product.model.js";
import RedisCache from "../../utils/redisCache.js";

//vendor auth
export const vendorAuth = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const phoneValidation = validatePhone(phoneNumber);

    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error,
      });
    }

    const validatedPhone = phoneValidation.normalized;

    const existingUser = await VendorProfile.findOne({
      phoneNumber: validatedPhone,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Account already exists with this phone number. Please login to continue.",
      });
    }

    // const otp = generateOtp();
    const otp = 1234; // For testing purposes, replace with generateOtp() in production
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);

    const phoneOtpData = {
      codeHash: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 1,
      lastSentAt: new Date(),
    };

    await VendorProfile.create({
      phoneNumber: validatedPhone,
      phoneOtp: phoneOtpData,
    });

    return res.status(200).json({
      success: true,
      type: "REGISTER",
      message: "OTP sent successfully. Please verify to complete registration.",
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
    await user.save();
    const jwtToken = jwt.sign(
      { id: user._id, role: "vendor" },
      process.env.JWT_SECRET,
      { expiresIn: "365d" },
    );

    const safeUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      isAdminVerified: user.isAdminVerified,
      isAadharVerified: user.isAadharVerified,
      isProfileCompleted: user.isProfileCompleted,
    };

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: safeUser,
      token: jwtToken,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
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

    const uploadIdPath = req.files.uploadId[0].location;

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
          uploadId: uploadIdPath,
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
export const getVendorProfile = async (req, res, next) => {
  try {
    const cacheKey = `vendor:v1:${JSON.stringify(req.query)}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.json(cached);

    const vendorProfileId = req.user.id;
    const vendor = await VendorCompany.findOne({ vendorId: vendorProfileId })
      .populate({
        path: "vendorId",
        select: "-password -phoneOtp -aadharOtp -__v",
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
    const { firstName, lastName, email, governmentIdNumber, governmentIdType } =
      req.body;

    // Sirf wo fields lo jo actually bheje gaye hain
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (governmentIdNumber)
      updateFields.governmentIdNumber = governmentIdNumber;
    if (governmentIdType) updateFields.governmentIdType = governmentIdType;

    if (req.files && req.files.uploadId) {
      updateFields.uploadId = req.files.uploadId[0].location;
    }

    const vendorProfileInfo = await VendorProfile.findByIdAndUpdate(
      vendorProfileId,
      { $set: updateFields },
      { new: true, select: "-aadharOtp -phoneOtp" },
    );

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
    if (!user) {
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
//vendor add Shop details
export const upsertVendorCompanyInfo = async (req, res) => {
  try {
    const { vendorId, ...companyData } = req.body;

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

    await VendorCompany.create({
      vendorId,
      ...companyData,
    });
    const vendor = await VendorProfile.findById(vendorId);
    vendor.isProfileCompleted = true;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Company details saved successfully",
      data: companyData,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
//update Shop details
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

export const getAllProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = { vendorId };

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    // Boolean filters
    if (req.query.varified !== undefined) {
      filter.varified = req.query.varified === "true";
    }

    if (req.query.disable !== undefined) {
      filter.disable = req.query.disable === "true";
    }

    if (req.query.avgRating) {
      filter.avgRating = { $gte: parseFloat(req.query.avgRating) };
    }

    if (req.query.pcategoryId) {
      filter.pcategoryId = req.query.pcategoryId;
    }

    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }

    if (req.query.subcategoryId) {
      filter.subcategoryId = req.query.subcategoryId;
    }

    if (req.query.brandId) {
      filter.brandId = req.query.brandId;
    }

    // // Location filters
    // if (req.query.city) {
    //   filter.city = req.query.city;
    // }

    // if (req.query.state) {
    //   filter.state = req.query.state;
    // }

    // Sorting
    const sortOptions = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      topRated: { avgRating: -1 },
      mostSold: { sold: -1 },
    };

    const sort = sortOptions[req.query.sort] || { createdAt: -1 };
    const [totalProducts, products] = await Promise.all([
      productModel.countDocuments(filter),
      productModel
        .find(filter)
        .populate("pcategoryId", "name")
        .populate("categoryId", "name")
        .populate("subcategoryId", "name")
        .populate("brandId", "name")
        .populate("defaultVariantId")
        .skip(skip)
        .limit(limit)
        .sort(sort),
    ]);

    if (!totalProducts) {
      return res.status(404).json({
        success: false,
        message: "No products found",
      });
    }

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: `Page ${page} does not exist`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
      pagination: {
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: page,
        limit,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(new APIError(500, error.message));
  }
};

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
      data: vendors,
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
    const response = { success: true, data: vendor };
    await RedisCache.set(cacheKey, response);

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid vendor ID",
    });
  }
};
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
    vendor.disable = !vendor.disable;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: `Vendor status disable ${vendor.disable ? "true" : "false"}`,
      data: {
        name: `${vendor.firstName} ${vendor.lastName}`,
        phoneNumber: vendor.phoneNumber,
        email: vendor.email,
      },
    });
  } catch (error) {
    next(error);
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
