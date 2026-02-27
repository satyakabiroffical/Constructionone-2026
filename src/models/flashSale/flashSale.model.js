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
            ref: 'PlatformModule',
            required: [true, 'moduleId is required'],
            index: true,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'vendorProfile',
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
        isCancelled: {
            type: Boolean,
            default: false,
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

// Virtual status — computed from time, never stored
flashSaleSchema.virtual('status').get(function () {
    if (this.isCancelled) return 'CANCELLED';
    const now = new Date();
    if (now < this.startDateTime) return 'UPCOMING';
    if (now <= this.endDateTime) return 'ACTIVE';
    return 'COMPLETED';
});

flashSaleSchema.set('toJSON', { virtuals: true });
flashSaleSchema.set('toObject', { virtuals: true });

// Indexes
flashSaleSchema.index({ moduleId: 1, isCancelled: 1, startDateTime: 1, endDateTime: 1 });
flashSaleSchema.index({ vendorId: 1, isCancelled: 1, createdAt: -1 });

// Statics — compute status for lean() docs
flashSaleSchema.statics.computeStatus = function (doc) {
    if (!doc) return null;
    if (doc.isCancelled) return 'CANCELLED';
    const now = new Date();
    if (now < new Date(doc.startDateTime)) return 'UPCOMING';
    if (now <= new Date(doc.endDateTime)) return 'ACTIVE';
    return 'COMPLETED';
};

flashSaleSchema.statics.attachStatus = function (docs) {
    if (!docs) return docs;
    if (Array.isArray(docs)) {
        return docs.map(d => ({ ...d, status: this.computeStatus(d) }));
    }
    return { ...docs, status: this.computeStatus(docs) };
};

export default mongoose.model('FlashSale', flashSaleSchema);
