import mongoose from "mongoose";

const serviceProviderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
    },

    providerType: {
      type: String,
      enum: ["SERVICE", "CONTRACTOR", "BIG_FIRM"],
      default: "SERVICE",
    },

    title: String,

    description: String,

    experience: Number,
    skills: [String],

    teamSize: {
      type: Number,
      default: 1,
    },

    priceRange: {
      min: Number,
      max: Number,
    },
    workingDayTime: {
      type: String, //"Mon - Sat | 10:00 AM - 06:00 PM"
    },
    serviceAreas: [
      {
        state: String,
        city: String,
        pincode: String,
      },
    ],

    location: {
      address: String,
      lat: Number,
      lng: Number,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceProvider", serviceProviderSchema);
