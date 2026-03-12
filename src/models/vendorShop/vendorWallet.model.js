import mongoose from "mongoose";
const vendorWalletSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
      unique: true,
    },

    totalBalance: {
      type: Number,
      default: 0,
    },

    availableBalance: {
      type: Number,
      default: 0,
    },

    onHoldBalance: {
      type: Number,
      default: 0,
    },

    nextSettlementDate: Date,
  },
  { timestamps: true },
);

export default mongoose.model("VendorWallet", vendorWalletSchema);
