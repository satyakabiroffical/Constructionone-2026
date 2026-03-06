import mongoose from "mongoose";

const serviceGallerySchema = new mongoose.Schema(
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

    images: [
      {
        type: String, // image URL (S3 / Cloudinary)
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("serviceGallery", serviceGallerySchema);

//exmp-data

// {
//  "vendorId": "66aa1234abcd",
//  "images": [
//    "https://cdn.com/img1.jpg",
//    "https://cdn.com/img2.jpg",
//    "https://cdn.com/img3.jpg"
//  ]
// }