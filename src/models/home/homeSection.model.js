import mongoose from 'mongoose';

const SECTION_TYPES = ['BANNER', 'PRODUCT_LIST', 'CATEGORY_LIST', 'VENDOR_LIST', 'BRAND_LIST'];
const SOURCE_TYPES = ['FLASH', 'TOP_SELLING', 'FEATURED', 'NEW_ARRIVALS', 'MANUAL', 'ALL'];

const homeSectionSchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlatformModule',
            required: [true, 'moduleId is required'],
            index: true,
        },
        key: {
            type: String,
            required: [true, 'key is required'],
            trim: true,
            // Unique per module — enforced via compound unique index below
        },
        title: {
            type: String,
            trim: true,
            default: '',
        },
        type: {
            type: String,
            enum: SECTION_TYPES,
            required: [true, 'type is required'],
        },
        sourceType: {
            type: String,
            enum: SOURCE_TYPES,
            default: 'ALL',
        },
        // Optional: pin a specific category/brand/vendor to this section
        sourceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        limit: {
            type: Number,
            default: 10,
            min: 1,
            max: 50,
        },
        order: {
            type: Number,
            default: 0,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { transform: (_, ret) => { delete ret.__v; return ret; } },
    }
);

// Primary query index — used by home engine on every public request
homeSectionSchema.index({ moduleId: 1, isActive: 1, order: 1 });

// Enforce unique key per module
homeSectionSchema.index({ moduleId: 1, key: 1 }, { unique: true });

export default mongoose.model('HomeSection', homeSectionSchema);
