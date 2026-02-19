import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product", // Assuming Product model
                },
                variant: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Variant", // If using variants
                },
                warranty: Number,
                price: Number,
                quantity: Number,
                returnInDays: Number,
                status: {
                    type: String,
                    enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"],
                    default: "PENDING",
                },
                indexStatus: Number,

            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        shippingAddress: {},
        status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"],
            default: "PENDING",
        },
        paymentStatus: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
            default: "PENDING",
        },
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "transactionModel",
        },
        invoice: String,
        reason: String,
        cancleBy: String,
        deliveredDate: Date,
    },
    { timestamps: true }
);

export default mongoose.model("orderModel", orderSchema);
