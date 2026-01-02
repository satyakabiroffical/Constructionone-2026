import UserModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const MAX_OTP_ATTEMPTS = 5;

export const authController = async (req, res, next) => {
  try {
    // const { error } = UserValidator.registerLoginUserSchema.validate(req.body);
    // if (error) {
    //     return res.status(400).json({
    //         success: false,
    //         error: error.details[0].message
    //     });
    // }

    const { name, email, phone } = req.body;
    const user = await UserModel.findOne({ phone });
    const now = new Date();

    let attempts = 0;
    if (user && user.phoneOtp) {
      attempts = user.phoneOtp.attempts || 0;

      if (user.phoneOtp.lastSentAt) {
        const timeSinceLastOtp = now - new Date(user.phoneOtp.lastSentAt);
        const cooldownPeriod = 60 * 1000;

        if (timeSinceLastOtp < cooldownPeriod) {
          const waitTime = Math.ceil(
            (cooldownPeriod - timeSinceLastOtp) / 1000
          );
          return res.status(429).json({
            success: false,
            error: `Please wait ${waitTime} seconds before requesting another OTP`,
          });
        }
      }

      if (attempts >= MAX_OTP_ATTEMPTS) {
        const lastAttemptDate = new Date(user.phoneOtp.lastSentAt);
        const hoursSinceLastAttempt =
          (now - lastAttemptDate) / (1000 * 60 * 60);

        if (hoursSinceLastAttempt < 24) {
          return res.status(429).json({
            success: false,
            error: `Daily OTP limit reached. Please try again after 24 hours`,
          });
        } else {
          attempts = 0;
        }
      }
    }

    // Hardcoded OTP for now
    const otp = 1234;
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const phoneOtpData = {
      codeHash: hashedOtp,
      expiresAt,
      attempts: attempts + 1,
      lastSentAt: now,
    };

    if (user) {
      user.phoneOtp = phoneOtpData;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Successfully sent OTP to phone number",
        otp: otp,
      });
    }

    const newUser = new UserModel({
      name,
      email,
      phone,
      phoneOtp: phoneOtpData,
    });

    await newUser.save();

    return res.status(200).json({
      success: true,
      message: "Successfully sent OTP to phone number",
      otp: otp,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, fcmToken, deviceId } = req.body;
    const user = await UserModel.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    if (user.disable) {
      return res
        .status(403)
        .json({ success: false, error: "User is disabled" });
    }

    if (!user.phoneOtp || !user.phoneOtp.codeHash) {
      return res.status(400).json({
        success: false,
        error: "No OTP is pending verification for this user",
      });
    }

    const { codeHash, expiresAt, attempts = 0 } = user.phoneOtp;

    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new OTP",
      });
    }
    if (attempts >= MAX_OTP_ATTEMPTS) {
      throw new Error(
        "Maximum OTP attempts exceeded. Please request a new OTP"
      );
    }

    const normalizedOtp = String(otp || "").trim();
    if (!normalizedOtp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const isMatch = await bcrypt.compare(normalizedOtp, codeHash);

    if (!isMatch) {
      user.phoneOtp.attempts = attempts + 1;
      await user.save();
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    user.phoneOtp.attempts = 0;
    user.phoneOtp = null;
    await user.save();

    // if (fcmToken && deviceId) {
    //     const userModelMap = {
    //         Driver: "Drivers",
    //         User: "Users",
    //     };

    //     const userModel = userModelMap["User"];

    //     FcmTokenModel.findOneAndUpdate(
    //         { userId: user._id, deviceId },
    //         {
    //             fcmToken,
    //             userId: user._id,
    //             deviceId,
    //             userType: "User",
    //             ...(userModel ? { userModel } : {}),
    //         },
    //         { new: true, upsert: true, setDefaultsOnInsert: true }
    //     );

    //     await admin.messaging().subscribeToTopic([fcmToken], "allUsers");
    //     //     const role = "User"
    //     await admin.messaging().subscribeToTopic([fcmToken], 'riders');
    // }

    const jwtToken = jwt.sign(
      { id: user._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user,
      token: jwtToken,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

// Only name & email update
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { name, email } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userProfile = await UserModel.findById(userId);
     
    if (!userProfile) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

   
    res.status(200).json({
      success: true,
      message: "Profile get successfully",
      data: userProfile,
    });
  } catch (err) {
    next(err);
  }
};


