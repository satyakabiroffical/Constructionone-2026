//asgr
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

    serviceProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProfile",
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

    serviceAreas: [
      {
        state: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        pincodes: [
          {
            type: String,
            required: true,
          },
        ],
      },
    ],

    estimatedPrice: Number,
    finalPrice: Number,

    trackingEnabled: {
      type: Boolean,
      default: false,
    },

    chatRoomId: String,
  },
  { timestamps: true },
);
