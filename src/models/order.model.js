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
        enum: ["PLACED", "PENDING", "SHIPPED","OUT_OF_DELIVERY", "DELIVERED", "CANCELLED","REQUESTED", "APPROVED", "REJECTED", "PICKED", "RETURNED"],
        default: "PANDING",
    },
    placedAt:{
         type: Date
    },
    cancelledAt:{
         type: Date
    },
     returnedAt :{
     type: Date,
        default:null
    },
     deliveredAt :{
     type: Date,
        default:null
    },
     returnRequestedAt: {
        type: Date,
        default:null
    },
    totalAmount: {
        type: Number,
        min: 0,
    },
    refundProcessedAt: {
        type: Date
    },
    refundAt: {
        type: Date
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
   
    refundAmount: {
        type: Number,
        min: 0
    },
    refundMethod: {
        type: String,
        enum: ["ORIGINAL_SOURCE", "WALLET", "BANK"],
    },
   
},{timestamps:true});


const STATUS_DATE_MAP = {
  PLACED: "placedAt",
  CANCELLED: "cancelledAt",
  DELIVERED: "deliveredAt",
  RETURN_REQUESTED: "returnRequestedAt",
  RETURNED: "returnedAt",
  REFUND_PROCESSED: "refundProcessedAt",
  REFUNDED: "refundAt"
};

orderSchema.pre('save',function(next){
    if(this.isModified("orderStatus")){
        const dataField = STATUS_DATE_MAP[this.orderStatus]
        if( dataField && !this[dataField]){
            this[dataField]=new Date();
        }
    }
    next();
})

orderSchema.pre('findOneAndUpdate',function(next){
    const update = this.getUpdate();
    if(update.orderStatus){
        const dateField  = STATUS_DATE_MAP[update.orderStatus]
        if(dateField ){
            update[dateField]=new Date();
        }
    }
    this.setUpdate(update);
    next();
})


export default mongoose.model("Order",orderSchema)
