import mongoose from "mongoose";

const vendorOfferSchema = new mongoose.Schema(
  {
    vendrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorProfile",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("VendorOffer", vendorOfferSchema); 
