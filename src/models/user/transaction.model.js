import mongoose from "mongoose";

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
    walletType:{
    type: String,
    enum: ["autoAdd", "addOnce", null],
    default: null,
  },
    walletPurpose: {
      type: String,
      enum: ["TOPUP", "ORDER_PAYMENT", "BOOKING_PAYMENT", "REFUND", "ORDER_REFUND", null],   
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
transactionSchema.index(
  { userId: 1 },
  { sparse: true }
);
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ paymentGateway: 1 });


export default mongoose.model("transactionModel", transactionSchema);
