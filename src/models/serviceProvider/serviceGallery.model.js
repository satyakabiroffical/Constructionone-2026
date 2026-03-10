import mongoose from "mongoose";

const serviceGallerySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    // serviceProfileId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "ServiceProfile",
    // },

    images: [
      {
        type: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceGallery", serviceGallerySchema);
