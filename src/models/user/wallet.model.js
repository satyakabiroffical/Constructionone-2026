const mongoose = require("mongoose");

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
  walletType:{
    type: String,
    enum: ["autoAdd", "addOnce", null],
    default: null,
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });


walletSchema.index({ userId: 1 });

walletSchema.index({ isActive: 1 });

walletSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model("walletModel", walletSchema);
