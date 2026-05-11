import mongoose from "mongoose";

const adminTransactionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["ORDER_SETTLEMENT", "WITHDRAWAL", "REFUND"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "PENDING",
    },

    amount: {
      type: Number,
      required: true,
    },

    description: String,

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBankAccount",
    },

    balanceBefore: Number,
    balanceAfter: Number,

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

export default mongoose.model("adminTransaction", adminTransactionSchema);
