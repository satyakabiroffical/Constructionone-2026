import mongoose from "mongoose";
const slotSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },
    time: {
      type: String, //"08:00 AM"
      required: true,
    },
    normalizedTime: {
      type: String,
    },

    maxBookings: {
      type: Number,
      required: true,
    },

    bookedCount: {
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
slotSchema.index({ normalizedTime: 1 }, { unique: true });

export default mongoose.model("ServiceSlot", slotSchema);
