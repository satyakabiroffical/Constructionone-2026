//priyanshu

import Review from "../../models/user/review.model.js";
import mongoose from "mongoose";
import { APIError } from "../../middlewares/errorHandler.js";
import redis from "../../config/redis.config.js";
import Order from "../../models/marketPlace/order.model.js";
import productModel from "../../models/vendorShop/product.model.js";


export const addReview = async (req, res, next) => {
    try {
        const { productId, rating, review } = req.body;
        const userId = req.user.id; // access token
        let images = [];
        const uploadedFiles = req.files?.images || req.files?.reviewImages || [];
        images = uploadedFiles.map((file) => file.location);


        const existingReview = await Review.findOne({ userId, productId });
        if (existingReview) {
            throw new APIError(400, "You have already reviewed on this product");
        }


        const hasOrdered = await Order.findOne({
            userId,
            "items.product": productId, // Assuming items have product reference
            status: "DELIVERED", // Only allow partial matching or ensure strict status
        });

        if (!hasOrdered) {
            throw new APIError(403, "You can only review products you have ordered and received")
        }

        // 3. Create Review
        const newReview = await Review.create({
            userId,
            productId,
            orderId: hasOrdered._id,
            rating,
            review,
            images,
        });

        const result = await Review.aggregate([
            {
                $match: {
                    productId: new mongoose.Types.ObjectId(productId)
                }
            },
            {
                $group: {
                    _id: "$productId",
                    avgRating: { $avg: "$rating" },
                    reviewCount: { $sum: 1 }
                }
            }
        ])

        const avgRating = result.length
            ? Number(result[0].avgRating).toFixed(1)
            : 0;
        await productModel.findByIdAndUpdate(productId, {
            avgRating: avgRating,
            reviewCount: result[0]?.reviewCount ?? 0
        });

        // 4. Clear Cache for this product's reviews
        const cacheKey = `reviews:product:${productId}`;
        await redis.del(cacheKey);

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review: newReview,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;

        // Cache Key
        const cacheKey = `reviews:product:${productId}`;
        const cachedReviews = await redis.get(cacheKey);

        if (cachedReviews) {
            return res.status(200).json(JSON.parse(cachedReviews));
        }

        const reviews = await Review.find({ productId, isApproved: true })
            .populate("userId", "name avatar") // Assuming User has name and avatar
            .sort({ createdAt: -1 });

        // Calculate average rating
        const stats = await Review.aggregate([
            { $match: { productId: new mongoose.Types.ObjectId(productId), isApproved: true } },
            {
                $group: {
                    _id: "$productId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $count: {} },
                },
            },
        ]);

        const result = {
            success: true,
            reviews,
            stats: stats[0] || { averageRating: 0, totalReviews: 0 },
        };

        // Set Cache (e.g., for 1 hour)
        await redis.set(cacheKey, JSON.stringify(result), "EX", 3600);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateReviewApproval = async (req, res, next) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) throw new APIError(404, "Review not found");

        const newStatus =
            typeof req.body.isApproved === "boolean"
                ? req.body.isApproved
                : !review.isApproved;

        review.isApproved = newStatus;
        await review.save();

        // Recalculate avgRating using only approved reviews
        // const [agg] = await Review.aggregate([
        //     { $match: { productId: review.productId, isApproved: true } },
        //     { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
        // ]);

        // await productModel.findByIdAndUpdate(review.productId, {
        //     avgRating: agg ? Number(agg.avgRating).toFixed(1) : 0,
        //     reviewCount: agg?.reviewCount ?? 0
        // });

        await redis.del(`reviews:product:${review.productId}`).catch(() => { });

        return res.status(200).json({
            success: true,
            message: `Review ${newStatus ? "approved" : "rejected"}`,
            review: { _id: review._id, isApproved: review.isApproved }
        });
    } catch (err) {
        next(err);
    }
};


export const getAllReviews = async (req, res, next) => {
    try {
        const { productId, isApproved, rating, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {};
        if (productId) filter.productId = productId;
        if (isApproved !== undefined) filter.isApproved = isApproved === "true";
        if (rating) filter.rating = Number(rating);

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate("userId", "name email")
                .populate("productId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Review.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            reviews
        });
    } catch (err) {
        next(err);
    }
};


