import mongoose from "mongoose";

const serviceBookingSchema = new mongoose.Schema(
  {
    bookingId: String,

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

    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
    },

    address: {
      address: String,
      lat: Number,
      lng: Number,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "QUOTED",
        "ACCEPTED",
        "STARTED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    quotedPrice: Number,
    finalPrice: Number,
    scheduledDate: Date,

    trackingEnabled: {
      type: Boolean,
      default: false,
    },

    chatRoomId: String,


    cancelledBy: String,
    cancelledByUserId: String,
    cancellationReason: String,

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceSlot",
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceBooking", serviceBookingSchema);

// {
//   "bookingId": "SRV1023",
//   "customerId": "65ff123abc",
//   "vendorId": "65ff456def",
//   "serviceId": "65ff999xyz",
//   "slotId": "65ff999xyz",
//   "status": "PENDING",
//   "serviceAddress": {
//     "address": "MP Nagar Zone 2 Bhopal",
//     "lat": 23.2599,
//     "lng": 77.4126,
//     "pincode": "462011",
//     "city": "Bhopal",
//     "state": "Madhya Pradesh"
//   },
//   "problemDescription": "Bathroom pipe leakage"
// }
