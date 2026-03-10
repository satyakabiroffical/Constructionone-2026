import AboutService from "../../models/serviceProvider/aboutService.model.js";
import RedisCache from "../../utils/redisCache.js";

export const createOrUpdateAboutService = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      description,
      serviceOffers,
      declarationMessage,
      experienceYears,
      languages,
    } = req.body;

    const aboutService = await AboutService.findOneAndUpdate(
      { vendorId },
      {
        description,
        serviceOffers,
        declarationMessage,
        experienceYears,
        languages,
      },
      {
        new: true,
        upsert: true,
      },
    );

    await RedisCache.delete(`about_service_${vendorId}`);

    return res.status(200).json({
      success: true,
      message: "About service saved successfully",
      data: aboutService,
    });
  } catch (error) {
    console.error("About Service Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while saving about service",
    });
  }
};

export const getVendorAboutService = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const cacheKey = `about_service_${vendorId}`;

    const cached = await RedisCache.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    const aboutService = await AboutService.findOne({
      vendorId,
      isActive: true,
    });

    if (!aboutService) {
      return res.status(404).json({
        success: false,
        message: "About service not found",
      });
    }

    await RedisCache.set(cacheKey, JSON.stringify(aboutService), 3600);

    return res.status(200).json({
      success: true,
      source: "db",
      data: aboutService,
    });
  } catch (error) {
    console.error("Get About Service Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching about service",
    });
  }
};

export const toggleAboutServiceStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const aboutService = await AboutService.findOne({ vendorId });

    if (!aboutService) {
      return res.status(404).json({
        success: false,
        message: "About service not found",
      });
    }

    aboutService.isActive = !aboutService.isActive;

    await aboutService.save();

    await RedisCache.delete(`about_service_${vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: aboutService,
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating status",
    });
  }
};
