import mongoose from "mongoose";
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
    },
    label: {
      type: String,
      enum: ["HOME", "OFFICE", "OTHER"],
      default: "HOME",
    },
    addressLine: String,
    city: String,
    country: String,

    location: {
      lat: Number,
      lng: Number,
    },
    landMark: {
      type: String,
      default: null,
    },
    pincode: String,
    phone: String,

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Address", addressSchema);
