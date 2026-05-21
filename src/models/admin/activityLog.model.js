import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    subAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    role: {
      type: String,
      enum: ["ADMIN", "SUB_ADMIN"],
    },

    action: {
      type: String,
      required: true,
    },

    module: {
      type: String,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    details: {
      type: Object,
    },

    ipAddress: String,

    userAgent: String,
  },
  { timestamps: true },
);

export default mongoose.model("ActivityLog", activityLogSchema);
