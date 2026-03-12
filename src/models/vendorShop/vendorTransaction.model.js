import mongoose from "mongoose";
const vendorTransactionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },

    type: {
      type: String,
      enum: ["ORDER_SETTLEMENT", "WITHDRAWAL", "REFUND"],
    },

    amount: Number,

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "SUCCESS",
    },

    orderId: String,
    description: String,
    settlementJobId: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("vendorTransaction", vendorTransactionSchema);
