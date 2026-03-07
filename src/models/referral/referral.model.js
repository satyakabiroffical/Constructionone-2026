/**
 * Written by Pradeep
 */
import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
    {
        referrerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        refereeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // ek user sirf ek baar refer ho sakta hai
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        status: {
            type: String,
            enum: ["PENDING", "COMPLETED"],
            default: "PENDING",
        },
        rewarded: {
            type: Boolean,
            default: false, // double-reward prevent karne ke liye
        },
        referrerReward: {
            type: Number,
            default: 0,
        },
        refereeReward: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

referralSchema.index({ referrerId: 1 });
referralSchema.index({ status: 1 });

export default mongoose.model("Referral", referralSchema);
