import mongoose from 'mongoose';
const { Schema } = mongoose;

const flashSaleItemSchema = new Schema(
    {
        flashSaleId: {
            type: Schema.Types.ObjectId,
            ref: 'FlashSale',
            required: true,
            index: true,
        },

        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },

        variantId: {
            type: Schema.Types.ObjectId,
            ref: 'Variant',
            required: true,
            index: true,
        },

        /**
         * Snapshot of Variant.price at flash sale creation time.
         * Used to display "original price" crossed out in UI.
         * Variant.price is NEVER modified — this is just a copy for reference.
         */
        basePriceSnapshot: {
            type: Number,
            required: true,
            min: 1,
        },

        flashDiscountPercent: {
            type: Number,
            required: [true, 'flashDiscountPercent is required'],
            min: [1, 'Discount must be at least 1%'],
            max: [99, 'Discount cannot exceed 99%'],
        },

        /**
         * Pre-computed: basePriceSnapshot - (basePriceSnapshot * flashDiscountPercent / 100)
         * Stored for fast listing reads.
         * NEVER written to Variant.price.
         */
        flashPrice: {
            type: Number,
            required: true,
            min: 1,
        },

        // Isolated stock pool — Variant.stock is NOT reduced by this
        allocatedStock: {
            type: Number,
            required: [true, 'allocatedStock is required'],
            min: [1, 'allocatedStock must be at least 1'],
        },

        // Incremented atomically via Redis Lua script + async DB sync
        sold: {
            type: Number,
            default: 0,
            min: 0,
        },

        /**
         * isActive drives price resolution.
         * true  → resolvePrice() returns flashPrice
         * false → resolvePrice() falls back to Variant.price (auto-revert)
         *
         * Set to false on: COMPLETED, CANCELLED
         */
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

/**
 * CRITICAL INDEX — prevents same variant appearing in two concurrent active flash sales.
 * DB-level guard (application-level check also exists in FlashSaleService).
 * partialFilterExpression: only enforces uniqueness when isActive = true
 */
flashSaleItemSchema.index(
    { variantId: 1, isActive: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
        name: 'unique_variant_in_active_flash',
    }
);

// For flash sale detail page query
flashSaleItemSchema.index({ flashSaleId: 1, isActive: 1 });

export default mongoose.model('FlashSaleItem', flashSaleItemSchema);
