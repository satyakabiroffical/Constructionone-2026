import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
    {
        // Groups all vendor sub-requests born from one user POST
        masterReturnId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MasterReturn",
            index: true,
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orderModel",
            required: true,
            index: true,
        },

        // The specific SUB order that belongs to this vendor
        subOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orderModel",
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        vandorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vandorModel",
            required: true,
            index: true,
        },

        // Items being returned — only items belonging to THIS vendor's sub-order
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                variant: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Variant",
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    default: 0,
                },
                reason: {
                    type: String,
                    trim: true,
                },
            },
        ],

        // Overall reason from the user
        reason: {
            type: String,
            trim: true,
            enum: [
                "DEFECTIVE_PRODUCT",
                "WRONG_ITEM_DELIVERED",
                "ITEM_NOT_AS_DESCRIBED",
                "DAMAGED_IN_SHIPPING",
                "MISSING_PARTS_OR_ACCESSORIES",
                "CHANGED_MIND",
                "OTHER",
            ],
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        images: {
            type: [String],
            default: [],
        },

        /*
         * Status lifecycle:
         *  PENDING → APPROVED → PICKUP_SCHEDULED → QC_PASSED → REFUND_INITIATED → COMPLETED
         *  PENDING → REJECTED
         *  PICKUP_SCHEDULED → QC_FAILED
         */
        status: {
            type: String,
            enum: [
                "PENDING",           // Submitted, awaiting vendor review
                "APPROVED",          // Vendor approved the return
                "REJECTED",          // Vendor rejected the return
                "PICKUP_SCHEDULED",  // Courier pickup scheduled
                "QC_PASSED",         // Quality check passed, refund to be issued
                "QC_FAILED",         // Quality check failed, no refund
                "REFUND_INITIATED",  // Refund process started
                "COMPLETED",         // Refund done, return closed
            ],
            default: "PENDING",
        },

        rejectionReason: {
            type: String,
            trim: true,
        },

        qcNote: {
            type: String,
            trim: true,
        },

        pickupScheduledAt: {
            type: Date,
        },

        // Refund amount computed for this vendor's items
        refundAmount: {
            type: Number,
            default: 0,
        },

        // Link to the Refund document once created
        refundId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Refund",
        },
    },
    { timestamps: true }
);

returnRequestSchema.index({ masterReturnId: 1 });
returnRequestSchema.index({ status: 1, vandorId: 1 });

export default mongoose.model("ReturnRequest", returnRequestSchema);
