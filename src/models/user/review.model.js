import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming User model name is "User" - typically standardized
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product", // Assuming Product model name
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orderModel", // Based on transaction.model.js reference
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        review: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        images: [
            {
                type: String, // URL to image
            },
        ],
        isApproved: {
            type: Boolean,
            default: true, // Auto-approve by default, change if admin approval needed
        },
    },
    { timestamps: true }
);

// Prevent multiple reviews for same product by same user
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
