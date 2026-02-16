const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Types.ObjectId,
      ref: "orderModel",
      default: null,
    },

    bookingId: {
      type: mongoose.Types.ObjectId,
      ref: "bookingModel",
      default: null,
    },

    userId: {
      type: mongoose.Types.ObjectId,
      ref: "userModel",
    },

    amount: Number,

    currency: {
      type: String,
      default: "INR",
    },

    paymentGateway: {
      type: String,
      enum: ["RAZORPAY"],
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    paymentMethod: {
      type: String,
      enum: ["UPI", "CARD", "NETBANKING", "WALLET", "COD", "ONLINE"],
    },

    status: {
      type: String,
      enum: ["CREATED", "SUCCESS", "FAILED", "REFUNDED","PENDING"],
      default: "FAILED",
    },
    paymentSessionId: String,
    payType: {
      type: String,
      enum: ["CREDIT", "DEBIT", null],
      default: null,
    },

    walletPurpose: {
      type: String,
      enum: ["TOPUP", "ORDER_PAYMENT", "BOOKING_PAYMENT", "REFUND", null],   
      default: null,
    },

    // rawResponse: {}, // webhook / gateway response
  },
  { timestamps: true },
);
transactionSchema.index(
  { razorpayOrderId: 1 },
  { sparse: true }
);


module.exports = mongoose.model("transactionModel", transactionSchema);
