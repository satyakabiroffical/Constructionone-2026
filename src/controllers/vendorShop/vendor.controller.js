import Vendor from "../../models/vendorShop/vendor.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ------------vendor ------------
export const vendorSignUp = async (req, res, next) => {
  try {
    const data = req.body;
    data.email = data.email.toLowerCase();

    const existingVendor = await Vendor.findOne({
      $or: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
    });

    if (existingVendor) {
      return res.status(400).json({
        message: "Email or phone number already in use. Please login",
      });
    }

    data.registeredAddress = data.registeredAddress || {};

    if (data["registeredAddress.fullAddress"]) {
      data.registeredAddress.fullAddress =
        data["registeredAddress.fullAddress"];
    }

    const lat = data["registeredAddress.latitude"];
    const lng = data["registeredAddress.longitude"];

    if (lat && lng) {
      data.registeredAddress.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }
    // ---------- HANDLE FILES ----------
    if (req.files) {
      data.documents = data.documents || {};
      data.bankDetails = data.bankDetails || {};

      if (req.files.storefrontPhotos) {
        data.documents.storefrontPhotos = req.files.storefrontPhotos.map(
          (file) => file.location,
        );
      }

      if (req.files.gstCertificate) {
        data.documents.gstCertificate = req.files.gstCertificate[0].location;
      }

      if (req.files.panCard) {
        data.documents.panCard = req.files.panCard[0].location;
      }

      if (req.files.tradeLicense) {
        data.documents.tradeLicense = req.files.tradeLicense[0].location;
      }

      if (req.files.isoCertificate) {
        data.documents.isoCertificate = req.files.isoCertificate[0].location;
      }

      if (req.files.cancelledCheque) {
        data.bankDetails.cancelledCheque =
          req.files.cancelledCheque[0].location;
      }
    }

    // ---------- HASH PASSWORD ----------
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);

    // ---------- CREATE VENDOR ----------
    const vendor = await Vendor.create(data);

    return res.status(201).json({
      success: true,
      message: "Vendor registered successfully. Awaiting admin verification.",
      data: {
        id: vendor._id,
        email: vendor.email,
        status: vendor.status,
        isVerified: vendor.isVerified,
        registeredAddress: vendor.registeredAddress,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const vendor = await Vendor.findOne({ email: email.toLowerCase() });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: vendor._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      isVerified: vendor.isVerified,
      status: vendor.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// export const updateVendor = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const vendor = await Vendor.findById(id);

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found",
//       });
//     }

//     // -------- UPDATE NORMAL FIELDS --------
//     Object.keys(req.body).forEach((key) => {
//       if (req.body[key] !== undefined) {
//         vendor[key] = req.body[key];
//       }
//     });

//     // -------- UPDATE DOCUMENTS (ONLY IF NEW FILES COME) --------
//     if (req.files) {
//       vendor.documents = vendor.documents || {};
//       vendor.bankDetails = vendor.bankDetails || {};

//       if (req.files.storefrontPhotos) {
//         vendor.documents.storefrontPhotos = req.files.storefrontPhotos.map(
//           (file) => file.location,
//         );
//       }

//       if (req.files.gstCertificate) {
//         vendor.documents.gstCertificate = req.files.gstCertificate[0].location;
//       }

//       if (req.files.panCard) {
//         vendor.documents.panCard = req.files.panCard[0].location;
//       }

//       if (req.files.tradeLicense) {
//         vendor.documents.tradeLicense = req.files.tradeLicense[0].location;
//       }

//       if (req.files.isoCertificate) {
//         vendor.documents.isoCertificate = req.files.isoCertificate[0].location;
//       }

//       if (req.files.cancelledCheque) {
//         vendor.bankDetails.cancelledCheque =
//           req.files.cancelledCheque[0].location;
//       }
//     }

//     await vendor.save();
//     return res.status(200).json({
//       success: true,
//       message: "Vendor updated successfully",
//       data: vendor,
//     });
//   } catch (error) {
//     console.error("Update Vendor Error:", error);

//     return res.status(400).json({
//       success: false,
//       message: error.message || "Vendor update failed",
//     });
//   }
// };
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    if ("password" in req.body) {
      return res.status(400).json({
        success: false,
        message: "Password update is not allowed",
      });
    }

    // Object.keys(req.body).forEach((key) => {
    //   if (req.body[key] !== undefined) {
    //     vendor[key] = req.body[key];
    //   }
    // });
    if (typeof req.body.registeredAddress === "string") {
      req.body.registeredAddress = JSON.parse(req.body.registeredAddress);
    }
    Object.keys(req.body).forEach((key) => {
      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        vendor[parent] = vendor[parent] || {};
        vendor[parent][child] = req.body[key];
      } else {
        vendor[key] = req.body[key];
      }
    });

    if (req.body.registeredAddress) {
      const { latitude, longitude } = req.body.registeredAddress;

      if (latitude && longitude) {
        vendor.registeredAddress ||= {};
        vendor.registeredAddress.location = {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        };
      }
    }

    if (req.files) {
      vendor.documents ||= {};
      vendor.bankDetails ||= {};

      if (req.files.storefrontPhotos) {
        vendor.documents.storefrontPhotos = req.files.storefrontPhotos.map(
          (f) => f.location,
        );
      }

      if (req.files.gstCertificate) {
        vendor.documents.gstCertificate = req.files.gstCertificate[0].location;
      }

      if (req.files.panCard) {
        vendor.documents.panCard = req.files.panCard[0].location;
      }

      if (req.files.tradeLicense) {
        vendor.documents.tradeLicense = req.files.tradeLicense[0].location;
      }

      if (req.files.isoCertificate) {
        vendor.documents.isoCertificate = req.files.isoCertificate[0].location;
      }

      if (req.files.cancelledCheque) {
        vendor.bankDetails.cancelledCheque =
          req.files.cancelledCheque[0].location;
      }
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Vendor update failed",
    });
  }
};
export const getVendorProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    // console.log("Authenticated Vendor ID:", vendorId);
    const vendor = await Vendor.findById(vendorId)
      // .select("-documents  -password -__v")
      .select(" -password -__v")
      .lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    await assignAutoBadges(vendor);
    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};
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

// ------------admin ------------
export const getAllVendors = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const { search, isVerified, sort } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { ownerName: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    let sortQuery = { createdAt: -1 };
    if (sort === "oldest") {
      sortQuery = { createdAt: 1 };
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(query).sort(sortQuery).skip(skip).limit(limit),
      Vendor.countDocuments(query),
    ]);

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
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

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
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateVendorVerificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.isVerified = isVerified;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor verification status updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Vendor verification update error:", error);
    throw error;
  }
};
export const addMultipleBadgesByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { badges } = req.body;

    if (!Array.isArray(badges) || badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Badges array is required",
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
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
    const { id } = req.params;
    const { badges } = req.body;

    if (!Array.isArray(badges) || badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Badges array is required",
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
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
export const toggleVendorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    vendor.isActive = !vendor.isActive;
    vendor.disable = !vendor.disable;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: `Vendor status toggled to ${vendor.disable ? "active" : "inactive"}`,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};
