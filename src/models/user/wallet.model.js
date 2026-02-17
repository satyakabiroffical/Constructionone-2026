import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userModel",
  },

  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: "INR",
    enum: ["INR", "USD"]
  },
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });


walletSchema.index({ userId: 1 });

walletSchema.index({ isActive: 1 });

walletSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model("walletModel", walletSchema);
