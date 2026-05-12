//vendorWithdrawalBalance.model
import mongoose from "mongoose";

const vendorWithdrawalBalanceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    amount: Number,

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejectReason: {
      type: String,
      default: "",
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBankAccount",
      // required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "vendorWithdrawalBalance",
  vendorWithdrawalBalanceSchema,
);
