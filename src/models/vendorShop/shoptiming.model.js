import mongoose from "mongoose";

const shopTimingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    openTime: {
      type: String,
      required: true,
    },

    closeTime: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

shopTimingSchema.index({ vendorId: 1, day: 1 }, { unique: true });
export const Shoptiming = mongoose.model("Shoptiming", shopTimingSchema);
