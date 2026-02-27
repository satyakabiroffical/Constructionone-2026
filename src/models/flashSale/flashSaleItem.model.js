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
        flashPrice: {
            type: Number,
            required: true,
            min: 1,
        },
        allocatedStock: {
            type: Number,
            required: [true, 'allocatedStock is required'],
            min: [1, 'allocatedStock must be at least 1'],
        },
        sold: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Indexes
flashSaleItemSchema.index({ variantId: 1, flashSaleId: 1 });
flashSaleItemSchema.index({ flashSaleId: 1 });

export default mongoose.model('FlashSaleItem', flashSaleItemSchema);
