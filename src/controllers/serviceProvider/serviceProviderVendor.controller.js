// asgr
import ServiceProfile from "../../models/serviceProvider/serviceProviderVendor.model.js";

export const getVendorsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { providerType } = req.query;

    const query = {
      categoryId,
      isAvailable: true,
      isVerified: true,
    };

    if (providerType) {
      query.providerType = providerType;
    }

    const vendors = await ServiceProfile.find(query)
      .populate("vendorId", "firstName lastName email phone avgRating")
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getAllServiceProviderVendors = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      categoryId,
      providerType,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {
      isAvailable: true,
      isVerified: true,
    };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (providerType) {
      query.providerType = providerType;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await ServiceProfile.countDocuments(query);

    const vendors = await ServiceProfile.find(query)
      .populate(
        "vendorId",
        "firstName lastName phone email avgRating profileImage",
      )
      .populate("categoryId", "name")
      .sort({ "vendorId.avgRating": -1 }) //  ye kaam nahi karega thenye try krna hai ? .sort({ avgRating: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
