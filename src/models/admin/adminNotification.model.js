import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "USER_CREATED",
        "ORDER_CREATED",
        "VENDOR_CREATED",
        "PRODUCT_CREATED",
      ],
      default: "USER_CREATED",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    color: {
      type: String,
      enum: ["green", "yellow", "red", "blue"],
      default: "blue",
    },
    redirectUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("AdminNotification", adminNotificationSchema);
