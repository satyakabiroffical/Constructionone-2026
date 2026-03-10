import ServiceReview from "../../models/serviceProvider/serviceReview.model.js";
import RedisCache from "../../utils/redisCache.js";
import Service from "../../models/serviceProvider/service.model.js";
import mongoose from "mongoose";
export const createReview = async (req, res) => {
  try {
    const { customerId, vendorId, serviceId, bookingId, rating, review } =
      req.body;

    if (!customerId || !vendorId || !bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "customerId, vendorId, bookingId and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // prevent duplicate review per booking
    const existingReview = await ServiceReview.findOne({ bookingId });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "Review already submitted for this booking",
      });
    }

    let images = [];

    if (req.files && req.files.images) {
      images = req.files.images.map((file) => file.location || file.path);
    }

    const newReview = await ServiceReview.create({
      customerId,
      vendorId,
      serviceId,
      bookingId,
      rating,
      review,
      images,
    });

    await calculateServiceAvgRating(serviceId);
    await RedisCache.delete(`vendor_reviews_${vendorId}`);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: newReview,
    });
  } catch (error) {
    console.error("Create Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating review",
    });
  }
};

// export const getVendorReviews = async (req, res) => {
//   try {
//     const { vendorId } = req.params;

//     if (!vendorId) {
//       return res.status(400).json({
//         success: false,
//         message: "vendorId is required",
//       });
//     }

//     const cacheKey = `vendor_reviews_${vendorId}`;

//     const cached = await RedisCache.get(cacheKey);

//     if (cached) {
//       return res.status(200).json({
//         success: true,
//         source: "cache",
//         data: JSON.parse(cached),
//       });
//     }

//     const reviews = await ServiceReview.find({ vendorId })
//       .populate("customerId", "name profileImage")
//       .sort({ createdAt: -1 });

//     await RedisCache.set(cacheKey, JSON.stringify(reviews), 3600);

//     return res.status(200).json({
//       success: true,
//       count: reviews.length,
//       data: reviews,
//     });
//   } catch (error) {
//     console.error("Get Reviews Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching reviews",
//     });
//   }
// };

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await ServiceReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await ServiceReview.findByIdAndDelete(reviewId);
    await calculateServiceAvgRating(review.serviceId);
    await RedisCache.delete(`vendor_reviews_${review.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting review",
    });
  }
};
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, review } = req.body;

    const existingReview = await ServiceReview.findById(reviewId);

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      existingReview.rating = rating;
    }

    if (review) existingReview.review = review;

    if (req.files && req.files.images) {
      const newImages = req.files.images.map(
        (file) => file.location || file.path,
      );

      existingReview.images = newImages;
    }

    await existingReview.save();
    await calculateServiceAvgRating(existingReview.serviceId);
    await RedisCache.delete(`vendor_reviews_${existingReview.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: existingReview,
    });
  } catch (error) {
    console.error("Update Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating review",
    });
  }
};

export const calculateServiceAvgRating = async (serviceId) => {
  try {
    const reviews = await ServiceReview.aggregate([
      {
        $match: {
          serviceId: new mongoose.Types.ObjectId(serviceId),
        },
      },
      {
        $group: {
          _id: "$serviceId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    let avgRating = 0;
    let reviewCount = 0;

    if (reviews.length > 0) {
      avgRating = Number(reviews[0].avgRating.toFixed(1));
      reviewCount = reviews[0].totalReviews;
    }

    await Service.findByIdAndUpdate(serviceId, {
      avgRating,
      reviewCount,
    });
    return { avgRating, reviewCount };
  } catch (error) {
    console.error("Calculate Avg Rating Error:", error);
  }
};

export const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;

    let { filter = "all", page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const cacheKey = `vendor_reviews_${vendorId}_${filter}_${page}_${limit}`;

    const cached = await RedisCache.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        ...JSON.parse(cached),
      });
    }

    let query = { vendorId };

    // filters
    if (filter === "verified") {
      query.isVerified = true;
    }

    if (filter === "withPhoto") {
      query.images = { $exists: true, $ne: [] };
    }

    let sortOption = { createdAt: -1 };

    if (filter === "latest") {
      sortOption = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ServiceReview.find(query)
        .populate("customerId", "name profileImage")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),

      ServiceReview.countDocuments(query),
    ]);

    const response = {
      count: reviews.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: reviews,
    };

    await RedisCache.set(cacheKey, JSON.stringify(response), 3600);

    return res.status(200).json({
      success: true,
      source: "db",
      ...response,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching reviews",
    });
  }
};

export const verifyReviewByAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "reviewId is required",
      });
    }

    const existingReview = await ServiceReview.findById(reviewId);

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (existingReview.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Review already verified",
      });
    }

    existingReview.isVerified = true;
    await existingReview.save();

    // clear vendor review cache
    await RedisCache.delete(`vendor_reviews_${existingReview.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Review verified successfully",
      data: existingReview,
    });
  } catch (error) {
    console.error("Verify Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying review",
    });
  }
};
