import mongoose from "mongoose";

/*
 * Refund — separate financial model that tracks the actual money movement.
 * Created when QC passes on a ReturnRequest (one Refund per ReturnRequest).
 * Currently credits to wallet; extensible to bank/UPI later.
 */
const refundSchema = new mongoose.Schema(
    {
        returnRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReturnRequest",
            required: true,
            index: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orderModel",
        },

        vandorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vandorModel",
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        refundMethod: {
            type: String,
            enum: ["WALLET", "BANK", "UPI", "ORIGINAL_PAYMENT"],
            default: "WALLET",
        },

        /*
         * INITIATED  — triggered, processing
         * SUCCESS    — money credited
         * FAILED     — something went wrong
         */
        status: {
            type: String,
            enum: ["INITIATED", "SUCCESS", "FAILED"],
            default: "INITIATED",
        },

        failureReason: {
            type: String,
            trim: true,
        },

        processedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

refundSchema.index({ status: 1 });

export default mongoose.model("Refund", refundSchema);
