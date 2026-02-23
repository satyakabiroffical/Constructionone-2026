// Written by Pradeep
import mongoose from 'mongoose';

/**
 * Banner Schema
 *
 * Fields:
 *  - moduleId     : which platform module this banner belongs to (e.g. Rental, Marketplace)
 *  - page         : which page to display on (e.g. HOME, CATEGORY, PRODUCT)
 *  - position     : banner slot position on that page (e.g. TOP, MIDDLE, BOTTOM)
 *  - image        : S3 URL of the banner image
 *  - title        : optional display title / alt text
 *  - redirectUrl  : optional CTA link
 *  - order        : sort order within the same page+position
 *  - isActive     : manual on/off toggle
 *  - startDate    : scheduling — show after this date
 *  - endDate      : scheduling — hide after this date
 *  - createdBy    : admin reference
 */

export const BANNER_PAGES = ['HOME', 'CATEGORY', 'PRODUCT', 'SEARCH', 'CART', 'CHECKOUT', 'CUSTOM'];
export const BANNER_POSITIONS = ['TOP', 'MIDDLE', 'BOTTOM', 'FLOATING', 'POPUP'];

const bannerSchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlatformModule',
            required: [true, 'Module ID is required'],
            index: true,
        },
        page: {
            type: String,
            enum: BANNER_PAGES,
            required: [true, 'Page is required'],
            uppercase: true,
        },
        position: {
            type: String,
            enum: BANNER_POSITIONS,
            required: [true, 'Position is required'],
            uppercase: true,
        },
        image: {
            type: String,
            required: [true, 'Banner image is required'],
        },
        title: {
            type: String,
            trim: true,
            default: '',
        },
        redirectUrl: {
            type: String,
            trim: true,
            default: '',
        },
        order: {
            type: Number,
            default: 0,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Compound indexes for fast public-facing queries
// Public: fetch banners for a module + page + position + active + scheduled
bannerSchema.index({ moduleId: 1, page: 1, position: 1, isActive: 1, order: 1 });
// Admin: filter by module + page
bannerSchema.index({ moduleId: 1, page: 1 });
// Scheduling: find active banners within date range
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
