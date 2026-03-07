// asgr
import ServiceProfile from "../../models/serviceProvider/serviceProvider.model.js";

export const createServiceProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;
    if (!vendorId) {
      return res.status(404).json({ message: "user not authorized" });
    }
    const {
      title,
      categoryId,
      providerType,
      businessName,
      experience,
      skills,
      teamSize,
      serviceAreas,
      priceRange,
      description,
      location,
      workingDayTime,
    } = req.body;

    const alreadyExist = await ServiceProfile.findOne({ vendorId });

    if (alreadyExist) {
      return res.status(400).json({
        success: false,
        message: "Service profile already exists",
      });
    }

    const serviceProfile = await ServiceProfile.create({
      vendorId,
      categoryId,
      providerType,
      businessName,
      experience,
      skills,
      teamSize,
      serviceAreas,
      priceRange,
      description,
      title,
      location,
      workingDayTime,
    });

    res.status(201).json({
      success: true,
      message: "Service profile created successfully",
      data: serviceProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const updateServiceProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const profile = await ServiceProfile.findOneAndUpdate(
      { vendorId },
      req.body,
      { new: true },
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Service profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated",
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getServiceProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const profile = await ServiceProfile.findOne({ vendorId })
      .populate("vendorId", "firstName lastName profileImage email avgRating")
      .populate("categoryId", "name isActive");

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getServiceVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;
    // Validate vendorId
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const profile = await ServiceProfile.findOne({ vendorId }).populate(
      "vendorId",
      "firstName lastName profileImage email avgRating",
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Service vendor profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//for customer
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

//createservice-vendorProfile
// {
//   "categoryId": "65df8f0a12ab23456789",
//   "providerType": "SERVICE",
//   "experience": 5,
//   "skills": ["Pipe Repair", "Bathroom Fitting"],
//   "teamSize": 1,
//   "description": "Professional plumber with 5 years experience",
//   "priceRange": {
//     "min": 200,
//     "max": 1500
//   },
//   "location": {
//     "address": "Bhopal MP",
//     "lat": 23.2599,
//     "lng": 77.4126
//   },
//   "serviceAreas": [
//     {
//       "state": "Madhya Pradesh",
//       "city": "Bhopal",
//       "pincode": "462001",
//       "radiusInKm": 10
//     }
//   ]
// }
