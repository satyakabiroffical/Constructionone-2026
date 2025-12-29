import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    items: [mongoose.Schema.Types.Mixed],
    shippingAddress: {},
    paymentMethod: {
        type: String,
        enum: ["COD", "UPI", "CARD", "NET_BANKING", "WALLET", "EMI", "BANK_TRANSFER", "PAYPAL", "STRIPE",],
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED"],
        default: "PENDING",
    },
    orderStatus: {
        type: String,
        enum: ["PLACED", "PANDING", "SHIPPED","OUT_OF _DELIVERY", "DELIVERED", "CANCELLED","REQUESTED", "APPROVED", "REJECTED", "PICKED", "RETURNED"],
        default: "PANDING",
    },

    totalAmount: {
        type: Number,
        min: 0,
    },
    returnRequestedAt :{
     type: Date,
        default:null
    },

    returnReason: {
        type: String,
        trim: true,
    },
    refundStatus: {
        type: String,
        enum: ["NOT_INITIATED", "INITIATED", "PROCESSING", "REFUNDED"],
        default: "NOT_INITIATED"
    },
    returnRequestedAt: {
        type: Date,
        default:null
    },
    refundAmount: {
        type: Number,
        min: 0
    },
    refundMethod: {
        type: String,
        enum: ["ORIGINAL_SOURCE", "WALLET", "BANK"],
    },
    refundProcessedAt: {
        type: Date
    }
},{timestamps:true});




export default mongoose.model("Order",orderSchema)
