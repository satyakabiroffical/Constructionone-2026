import mongoose from "mongoose";
//asgr
const serviceProfileSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
    },

    providerType: {
      type: String,
      enum: ["SERVICE", "CONTRACTOR", "BIG_FIRM"],
      defult: "SERVICE",
    },

    businessName: String, // big firm ke liye
    experience: Number, // years

    skills: [String],

    teamSize: {
      type: Number, // contractors / firms
      default: 1,
    },

    serviceAreas: [
      {
        state: String,
        city: String,
        pincode: String,

        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number], // [lng, lat]
          },
        },

        radiusInKm: Number,
      },
    ],

    priceRange: {
      min: Number,
      max: Number,
    },

    description: String,

    documents: [
      {
        type: String, // license / gst / etc
      },
    ],

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    totalJobs: {
      type: Number,
      default: 0,
    },
    location: {
      address: String,
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceProfile", serviceProfileSchema);
