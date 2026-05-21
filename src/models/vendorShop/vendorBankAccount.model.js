import mongoose from "mongoose";

const vendorBankAccountSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },

    // optional for only UPI accounts
    accountNumber: {
      type: String,
      trim: true,
      default: null,
    },

    confirmAccountNumber: {
      type: String,
      trim: true,
      default: null,
    },

    accountType: {
      type: String,
      enum: ["Saving", "Current", "NRO", "NRE", "Other"],
      default: "Other",
    },

    // optional for only UPI accounts
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    // optional for only UPI accounts
    bankName: {
      type: String,
      trim: true,
      default: null,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // optional
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    cancelledCheque: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "VendorBankAccount",
  vendorBankAccountSchema,
);