import mongoose from "mongoose";

const servicePackageSchema = new mongoose.Schema(
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
      enum: ["BASIC", "STANDARD", "PREMIUM"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // deliveryDays: {
    //   type: Number,
    //   default: 1,
    // },

    // revisions: {
    //   type: Number,
    //   default: 0,
    // },

    features: [
      {
        type: String,
      },
    ],

    description: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServicePackage", servicePackageSchema);

// {
//   "vendorId": "68788911",
//   "serviceProfileId": "68788922",
//   "title": "STANDARD",
//   "price": 300,
//   "features": [
//      "revisions unlimited",
//     "3 Concept Design",
//     "High Resolution",
//     "Source File",
//     "Commercial Use",
//     "3 Days Delivery"
//   ]
// }

//  "revisions": 2,
//  "deliveryDays": 5,
