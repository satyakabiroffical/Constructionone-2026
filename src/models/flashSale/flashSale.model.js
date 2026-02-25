import mongoose from 'mongoose';
const { Schema } = mongoose;

const flashSaleSchema = new Schema(
    {
        label: {
            type: String,
            required: [true, 'Flash sale label is required'],
            trim: true,
        },

        moduleId: {
            type: Schema.Types.ObjectId,
            ref: 'Module',
            required: [true, 'moduleId is required'],
            index: true,
        },

        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'VendorProfile',
            required: [true, 'vendorId is required'],
            index: true,
        },

        startDateTime: {
            type: Date,
            required: [true, 'startDateTime is required'],
        },

        endDateTime: {
            type: Date,
            required: [true, 'endDateTime is required'],
        },

        /**
         * Status is auto-managed by FlashSaleService.
         * UPCOMING  → not yet started
         * ACTIVE    → currently running
         * COMPLETED → ended naturally or manually
         * CANCELLED → cancelled by admin
         *
         * Do NOT set this field manually from controllers.
         * Use activateFlashSale() / expireFlashSale() / cancelFlashSale()
         */
        status: {
            type: String,
            enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
            default: 'UPCOMING',
            index: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Home Engine Query Index — finds active flash sales for a module fast
flashSaleSchema.index({ moduleId: 1, status: 1, startDateTime: 1 });

// Admin listing Index — sort by latest
flashSaleSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export default mongoose.model('FlashSale', flashSaleSchema);
