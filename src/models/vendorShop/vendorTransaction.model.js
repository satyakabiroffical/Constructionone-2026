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
    transactionId: {
      type: String,
      // required: true,
    },

    amount: Number,

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "HOLD", "CANCELLED","SETTLED"],
      default: "PENDING",
    },

    orderId: String,
    description: String,

    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBankAccount",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    settlementJobId: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("vendorTransaction", vendorTransactionSchema);
