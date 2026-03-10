// controllers/serviceGalleryController.js
import ServiceGallery from "../../models/serviceProvider/serviceGallery.model.js";
import mongoose from "mongoose";
import RedisCache from "../../utils/redisCache.js";

const clearGalleryCache = async (vendorId = null) => {
  try {
    if (vendorId) {
      // Clear specific vendor gallery cache
      await RedisCache.del(`gallery:vendor:${vendorId}`);
    }
    // Clear all galleries list cache
    const keys = await RedisCache.keys("galleries:page:*");
    if (keys.length > 0) {
      await RedisCache.del(keys);
    }
  } catch (error) {
    console.error("Redis cache clear error:", error);
  }
};

export const getGalleryByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID format",
      });
    }

    const cacheKey = `gallery:vendor:${vendorId}`;

    // Redis cache check
    const cachedData = await RedisCache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
        fromCache: true,
      });
    }

    const gallery = await ServiceGallery.findOne({
      vendorId,
      isActive: true,
    }).populate({
      path: "vendorId",
      select: "firstName lastName email phone",
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    const images = gallery.images || [];

    // Cache set (5 min)
    await RedisCache.set(cacheKey, JSON.stringify(images), 300);

    res.status(200).json({
      success: true,
      data: images,
      count: images.length,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
      error: error.message,
    });
  }
};

//vendor
export const getMyGallery = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const cacheKey = `gallery:vendor:${vendorId}`;

    const cachedData = await RedisCache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
        fromCache: true,
      });
    }

    const gallery = await ServiceGallery.findOne({
      vendorId,
      isActive: true,
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    const images = gallery.images || [];

    await RedisCache.set(cacheKey, JSON.stringify(images), 300);

    res.status(200).json({
      success: true,
      data: images,
      count: images.length,
      fromCache: false,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
    });
  }
};
export const addImages = async (req, res) => {
  try {
    // const { vendorId } = req.body;
    const vendorId = req.user.id;
    let imageUrls = [];

    if (req.files && req.files.images) {
      imageUrls = req.files.images.map((file) => file.location || file.path);
    } else if (req.file) {
      imageUrls = [req.file.location || req.file.path];
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    let gallery = await ServiceGallery.findOne({ vendorId });

    if (!gallery) {
      gallery = new ServiceGallery({
        vendorId,
        images: imageUrls,
      });
    } else {
      gallery.images.push(...imageUrls);
    }

    await gallery.save();
    await clearGalleryCache(vendorId);

    res.status(200).json({
      success: true,
      message: `${imageUrls.length} image(s) added`,
      data: gallery,
    });
  } catch (error) {
    console.error("Add images error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add images",
    });
  }
};
export const deleteImages = async (req, res) => {
  try {
    const { indexes } = req.body;
    const vendorId = req.user.id;

    if (indexes === undefined) {
      return res.status(400).json({
        success: false,
        message: "indexes required",
      });
    }

    const deleteIndexes = Array.isArray(indexes) ? indexes : [indexes];
    const gallery = await ServiceGallery.findOne({
      vendorId,
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    const before = gallery.images.length;

    deleteIndexes.sort((a, b) => b - a);

    deleteIndexes.forEach((i) => {
      if (i >= 0 && i < gallery.images.length) {
        gallery.images.splice(i, 1);
      }
    });

    const deleted = before - gallery.images.length;

    await gallery.save();
    await RedisCache.delete(`vendor:gallery:${vendorId}`);
    res.status(200).json({
      success: true,
      message: `${deleted} image(s) deleted`,
      images: gallery.images,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

// admin api
export const getAllVendorsGallery = async (req, res) => {
  try {
    const allGalleryEntries = await ServiceGallery.find({ isActive: true })
      .populate(
        "vendorId",
        "email firstName lastName businessName profileImage",
      )
      .sort({ createdAt: -1 });

    // Group by vendorId
    const vendorGalleryMap = new Map();

    allGalleryEntries.forEach((entry) => {
      const vendorId = entry.vendorId._id.toString();

      if (!vendorGalleryMap.has(vendorId)) {
        vendorGalleryMap.set(vendorId, {
          vendorId: vendorId,
          vendorDetails: {
            _id: entry.vendorId._id,
            email: entry.vendorId.email,
            firstName: entry.vendorId.firstName,
            lastName: entry.vendorId.lastName,
            businessName: entry.vendorId.businessName,
          },
          images: [],
          totalImages: 0,
          lastUpdated: entry.createdAt,
        });
      }

      const vendorData = vendorGalleryMap.get(vendorId);
      vendorData.images.push(...entry.images);
      vendorData.totalImages = vendorData.images.length;

      // Update lastUpdated agar ye entry nayi hai
      if (new Date(entry.createdAt) > new Date(vendorData.lastUpdated)) {
        vendorData.lastUpdated = entry.createdAt;
      }
    });

    // Map ko array me convert karo
    const result = Array.from(vendorGalleryMap.values());

    res.status(200).json({
      success: true,
      data: result,
      totalVendors: result.length,
      fromCache: false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
