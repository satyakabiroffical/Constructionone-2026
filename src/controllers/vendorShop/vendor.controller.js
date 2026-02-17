import Vendor from "../../models/vendorShop/vendor.model.js";
import bcrypt from "bcryptjs";

export const createVendor = async (req, res, next) => {
  try {
    const data = req.body;
    const documents = {};

    if (req.files) {
      if (req.files.storefrontPhotos) {
        documents.storefrontPhotos = req.files.storefrontPhotos.map(
          (file) => file.location,
        );
      }

      if (req.files.gstCertificate) {
        documents.gstCertificate = req.files.gstCertificate[0].location;
      }

      if (req.files.panCard) {
        documents.panCard = req.files.panCard[0].location;
      }

      if (req.files.tradeLicense) {
        documents.tradeLicense = req.files.tradeLicense[0].location;
      }

      if (req.files.isoCertificate) {
        documents.isoCertificate = req.files.isoCertificate[0].location;
      }
    }

    // password hash
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
    data.documents = documents;

    const vendor = await Vendor.create(data);

    return res.status(201).json({
      success: true,
      message: "Vendor registered successfully. Awaiting admin verification.",
      data: {
        id: vendor._id,
        email: vendor.email,
        status: vendor.status,
        isVerified: vendor.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const vendorLogin = async (req, res) => {
  const { email, password } = req.body;

  const vendor = await Vendor.findOne({ email });
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
};

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

export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // -------- UPDATE NORMAL FIELDS --------
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        vendor[key] = req.body[key];
      }
    });

    // -------- UPDATE DOCUMENTS (ONLY IF NEW FILES COME) --------
    if (req.files) {
      vendor.documents = vendor.documents || {};

      if (req.files.storefrontPhotos) {
        vendor.documents.storefrontPhotos = req.files.storefrontPhotos.map(
          (file) => file.location,
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

export const getVendorProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId)
      .select("-documents -__v")
      .lean();

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
    next(error);
  }
};

const assignAutoBadges = async (vendor) => {
  const badges = new Set(vendor.badges || []);
  if (vendor.totalOrders >= 500) badges.add("MOST_SOLD");
  if (vendor.averageDeliveryTime <= 24) badges.add("FAST_DELIVERY");
  if (vendor.rating >= 4.5) badges.add("TOP_VENDOR");
  if (vendor.pastQualityDisputes === false) badges.add("TRUSTED_SELLER");

  if (
    badges.has("MOST_SOLD") &&
    badges.has("FAST_DELIVERY") &&
    vendor.rating >= 4.5
  ) {
    badges.add("TOP_VENDOR");
  }

  vendor.badges = Array.from(badges);
  await vendor.save();
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
