import VendorReview from "../../models/vendorShop/vendorReviews.model.js";
import { VendorProfile } from "../../models/vendorShop/vendor.model.js";
import RedisCache from "../../utils/redisCache.js";

//vendor profile reviews
export const addReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId, rating, review } = req.body;

    if (!vendorId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID and rating are required",
      });
    }

    // Prevent duplicate review
    const alreadyReviewed = await VendorReview.exists({
      userId,
      vendorId,
    });

    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "Review already exists. Please update instead.",
      });
    }

    const images = req.files?.images?.length
      ? req.files.images.map((file) => file.location)
      : [];

    const newReview = await VendorReview.create({
      userId,
      vendorId,
      rating,
      review,
      images,
    });

    await updateVendorStats(vendorId);
    const populatedReview = await VendorReview.findById(newReview._id).populate(
      "userId",
      "firstName lastName profileImage",
    );
    await RedisCache.delete(`vendor:v1:${vendorId}`);
    await RedisCache.deletePattern(`vendor:reviews:v2:${vendorId}:*`);

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: populatedReview,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, review } = req.body;

    const existingReview = await VendorReview.findOne({
      _id: reviewId,
      userId,
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found or not authorized",
      });
    }

    // Update only provided fields
    if (rating !== undefined) {
      existingReview.rating = Number(rating);
    }

    if (review !== undefined) {
      existingReview.review = review;
    }
    const vendorId = existingReview.vendorId;
    // Images optional
    if (req.files?.images?.length) {
      const images = req.files.images.map((file) => file.location);
      existingReview.images = images;
      //replace
      // OR append:
      // existingReview.images.push(...images);
    }

    await existingReview.save();
    // Recalculate vendor stats
    const populatedReview = await VendorReview.findById(
      existingReview._id,
    ).populate("userId", "firstName lastName profileImage");

    await updateVendorStats(existingReview.vendorId);

    await RedisCache.delete(`vendor:v1:${existingReview.vendorId}`);
    await RedisCache.deletePattern(
      `vendor:reviews:v2:${existingReview.vendorId}:*`,
    );

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: populatedReview,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await VendorReview.findOne({
      _id: reviewId,
      userId: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or unauthorized",
      });
    }

    const vendorId = review.vendorId;
    await VendorReview.findByIdAndDelete(reviewId);
    await updateVendorStats(vendorId);

    await RedisCache.delete(`vendor:v1:${vendorId}`);
    await RedisCache.deletePattern(`vendor:reviews:v2:${vendorId}:*`);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getVendorReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    // Cache key
    const cacheKey = `vendor:reviews:v2:${vendorId}:page:${page}:limit:${limit}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.json(cached);

    // Get vendor stats
    const vendor = await VendorProfile.findById(vendorId).select(
      "avgRating totalReviews recommendationPercentage ratingBreakdown",
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const reviews = await VendorReview.find({ vendorId })
      .populate("userId", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await VendorReview.countDocuments({ vendorId });

    const response = {
      success: true,
      vendorStats: {
        avgRating: vendor.avgRating,
        totalReviews: vendor.totalReviews,
        recommendationPercentage: vendor.recommendationPercentage,
        ratingBreakdown: vendor.ratingBreakdown,
      },
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    await RedisCache.set(cacheKey, response, 300);
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await VendorReview.findById(reviewId);

    if (review.helpfulBy.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Already marked helpful",
      });
    }

    review.helpfulBy.push(userId);
    review.helpfulCount += 1;

    await review.save();
    const vendorId = review.vendorId;
    await RedisCache.delete(`vendor:v1:${vendorId}`);
    await RedisCache.deletePattern(`vendor:reviews:v2:${vendorId}:*`);

    res.status(200).json({
      success: true,
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateVendorStats = async (vendorId) => {
  const stats = await VendorReview.aggregate([
    { $match: { vendorId } },
    {
      $group: {
        _id: "$vendorId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        recommended: {
          $sum: {
            $cond: [{ $gte: ["$rating", 4] }, 1, 0],
          },
        },
        ratings: { $push: "$rating" },
      },
    },
  ]);

  if (!stats.length) return;

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  stats[0].ratings.forEach((r) => ratingBreakdown[r]++);

  await VendorProfile.findByIdAndUpdate(vendorId, {
    avgRating: Number(stats[0].avgRating.toFixed(1)),
    totalReviews: stats[0].totalReviews,
    recommendationPercentage: Math.round(
      (stats[0].recommended / stats[0].totalReviews) * 100,
    ),
    ratingBreakdown,
  });
};
