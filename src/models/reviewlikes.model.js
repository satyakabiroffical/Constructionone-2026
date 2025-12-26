import mongoose from "mongoose";

const reviewLikesSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isLiked: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate likes (1 user → 1 review)
reviewLikesSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

const ReviewLikes = mongoose.model("ReviewLikes", reviewLikesSchema);

export default ReviewLikes;
