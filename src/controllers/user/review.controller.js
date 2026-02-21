import Review from "../../models/user/review.model.js";
import mongoose from "mongoose";
import { APIError } from "../../middlewares/errorHandler.js";
import redis from "../../config/redis.config.js";
import Order from "../../models/marketPlace/order.model.js";


export const addReview = async (req, res, next) => {
    try {
        const { productId, rating, review, images } = req.body;
        const userId = req.user.id; // access token

        const existingReview = await Review.findOne({ userId, productId });
        if (existingReview) {
            return next(new APIError(400, "You have already reviewed this product"));
        }



        const hasOrdered = await Order.findOne({
            userId,
            "items.product": productId, // Assuming items have product reference
            status: "DELIVERED", // Only allow partial matching or ensure strict status
        });

        if (!hasOrdered) {
            return next(
                new APIError(403, "You can only review products you have ordered and received")
            );
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
