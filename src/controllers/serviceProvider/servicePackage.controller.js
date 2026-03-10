import ServicePackage from "../../models/serviceProvider/servicePackage.model.js";
import RedisCache from "../../utils/redisCache.js";

export const createServicePackage = async (req, res) => {
  try {
    const { vendorId, serviceProfileId, title, price, features, description } =
      req.body;

    // basic validation
    if (!vendorId || !title || !price) {
      return res.status(400).json({
        success: false,
        message: "vendorId, title and price are required",
      });
    }

    const allowedTitles = ["BASIC", "STANDARD", "PREMIUM"];
    if (!allowedTitles.includes(title)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package title",
      });
    }

    // check duplicate package (same vendor + title)
    const existingPackage = await ServicePackage.findOne({
      vendorId,
      title,
    });

    if (existingPackage) {
      return res.status(409).json({
        success: false,
        message: `${title} package already exists for this vendor`,
      });
    }

    // create package
    const newPackage = await ServicePackage.create({
      vendorId,
      serviceProfileId,
      title,
      price,
      features,
      description,
    });

    // clear cache if using redis
    await RedisCache.delete(`vendor_packages_${vendorId}`);

    return res.status(201).json({
      success: true,
      message: "Service package created successfully",
      data: newPackage,
    });
  } catch (error) {
    console.error("Create Service Package Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating service package",
    });
  }
};

export const getVendorPackages = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const cacheKey = `vendor_packages_${vendorId}`;

    // check cache
    const cachedData = await RedisCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: JSON.parse(cachedData),
      });
    }

    const packages = await ServicePackage.find({
      vendorId,
      isActive: true,
    }).sort({ price: 1 });

    await RedisCache.set(cacheKey, JSON.stringify(packages), 3600);

    return res.status(200).json({
      success: true,
      source: "db",
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    console.error("Get Vendor Packages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching packages",
    });
  }
};

export const updateServicePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const { price, features, description, isActive, title } = req.body;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: "packageId is required",
      });
    }

    const existingPackage = await ServicePackage.findById(packageId);

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const allowedTitles = ["BASIC", "STANDARD", "PREMIUM"];
    if (!allowedTitles.includes(title)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package title",
      });
    }
    if (price !== undefined) existingPackage.price = price;
    if (title !== undefined) existingPackage.title = title;
    if (features !== undefined) existingPackage.features = features;
    if (description !== undefined) existingPackage.description = description;
    if (isActive !== undefined) existingPackage.isActive = isActive;

    await existingPackage.save();

    // clear cache
    await RedisCache.delete(`vendor_packages_${existingPackage.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
      data: existingPackage,
    });
  } catch (error) {
    console.error("Update Package Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating package",
    });
  }
};

export const deleteServicePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: "packageId is required",
      });
    }

    const existingPackage = await ServicePackage.findById(packageId);

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    existingPackage.isActive = false;
    await existingPackage.save();

    // clear cache
    await RedisCache.delete(`vendor_packages_${existingPackage.vendorId}`);
    return res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete Package Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting package",
    });
  }
};
