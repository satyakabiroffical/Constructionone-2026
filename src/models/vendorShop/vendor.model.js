import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  fullAddress: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
});

const vendorSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: addressSchema,
      required: true,
    },

    deliveryTime: {
      type: String,
      enum: ["same_day", "4_6_hr"],
      required: true,
    },

    shopImages: [
      {
        type: String,
        required: true,
      },
    ],

    badges: [
      {
        type: String,
        enum: ["topVendor", "mostSeller", "fastDelivery"],
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Vendor", vendorSchema);
