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
                returnPolicy: {
                    type: String,
                },
                status: {
                    type: String,
                    enum: ["PENDING", "CONFIRMED", "SHIPPED", "VENDOR_CONFIRMED", "VENDOR_CANCELLED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"],
                    default: "PENDING",
                },
                indexStatus: Number,
                thumbnail: String,

            },
        ],
        vandorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vandorModel",
            // required: false // Master order won't have this
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orderModel",
            default: null
        },
        orderType: {
            type: String,
            enum: ["MASTER", "SUB"],
            default: "SUB" // Default to SUB if not specified, but we will specify
        },
        cityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cityModel",
        },
        totalAmount: {
            type: Number,
        },
        netAmount: {
            type: Number,
        },
        shippingAddress: {},            
        status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "SHIPPED", "VENDOR_CONFIRMED", "VENDOR_CANCELLED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED","RETURN_REQUESTED", "MULTI_STATE"],
            default: "PENDING",
        },

        paymentStatus: {
            type: String,
            enum: ["UNPAID", "PAID", "FAILED", "REFUNDED"],
            default: "UNPAID",
        },
        paymentMethod: {
            type: String,
            enum: ["ONLINE", "COD", "WALLET"],
        },
        paymentFailedReason: {
            type: String,
            trim: true,
        },
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "transactionModel",
        },
        transactionRef: String,
        invoice: String,
        reason: String,
        remark: String,
        cancleBy: {
            type: String,
            enum: ["COSTOMER", "ADMIN", "VANDOR", "SUB_ADMIN"],
        },
        deliveredDate: Date,
    },
    { timestamps: true }
);
orderSchema.index({ parentId: 1, orderType: 1 });
orderSchema.index({ vandorId: 1, orderType: 1 });
orderSchema.index({ status: 1 });

export default mongoose.model("orderModel", orderSchema);
