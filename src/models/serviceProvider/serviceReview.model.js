import mongoose from "mongoose";

const serviceReviewSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
    },
    rating: Number,
    review: String,
    serviceName: String,

    images: [String],
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("serviceReview", serviceReviewSchema);

//exmp-data

// {
//  "vendorId": "66aa1234abcd",
//  "serviceName": "Interior Design",
//  "rating": 5,
//  "message": "Amazing work and fast delivery",
//  "images": [
//    "https://cdn.com/review1.jpg",
//    "https://cdn.com/review2.jpg"
//  ]
// }

// const reviews = await Review.find({ vendorId })
//   .populate({
//     path: "userId",
//     select: "firstName lastName profileImage"
//   })
//   .sort({ createdAt: -1 });
// {
//  "reviews": [
//   {
//    "_id": "reviewId",
//    "rating": 5,
//    "message": "Amazing work and fast delivery",
//    "serviceName": "Interior Design",
//    "images": ["img1.jpg"],
//    "createdAt": "2026-03-02",

//    "userId": {
//      "firstName": "Asgar",
//      "lastName": "Ansari",
//      "profileImage": "profile.jpg"
//    }
//   }
//  ]
// }
