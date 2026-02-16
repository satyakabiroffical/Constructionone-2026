import Vendor from "../../models/vendorShop/vendor.model.js";

export const createVendor = async (req, res, next) => {
  try {
    if (!req.files?.shopImages?.length) {
      return res.status(400).json({
        success: false,
        message: "At least one shop image is required",
      });
    }
    const allImageKeys = req.files.shopImages.map((file) => file.key);

    const vendor = await Vendor.create({
      ...req.body,
      shopImages: allImageKeys,
    });

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    let query = { status: "active" };
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Vendor.countDocuments(query);

    const vendors = await Vendor.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
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

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndUpdate(req.params.id, {
      status: "inactive",
    });

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleVendorStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    vendor.status = vendor.status === "active" ? "inactive" : "active";
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor status changed to ${vendor.status}`,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
