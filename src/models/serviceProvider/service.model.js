//vendor will create their service according to this
import mongoose from "mongoose";
const serviceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    serviceProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProfile",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    serviceImages: [
      {
        type: String,
      },
    ],

    priceRange: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
    },

    duration: {
      type: Number, // minutes
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    totalBookings: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Service", serviceSchema);
