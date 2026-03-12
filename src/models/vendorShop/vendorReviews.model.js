import mongoose from "mongoose";

const vendorReviewsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    review: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    images: [String],

    // Helpful feature
    helpfulCount: {
      type: Number,
      default: 0,
    },

    helpfulBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

// One review per user per vendor
vendorReviewsSchema.index({ userId: 1, vendorId: 1 }, { unique: true });
export default mongoose.model("vendorReviews", vendorReviewsSchema);
