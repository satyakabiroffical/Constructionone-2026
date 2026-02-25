/**
 * Section Resolver Engine
 *
 * Each resolver is a pure async function:
 *   (section: HomeSection) => Promise<data[]>
 *
 * Adding a new section type = add one function here. No switch/case anywhere.
 */
import Banner from '../models/banner/banner.model.js';
import Pcategory from '../models/category/pcategory.model.js';
import Product from '../models/vendorShop/product.model.js';
import { VendorProfile } from '../models/vendorShop/vendor.model.js';  // named export
import Brand from '../models/vendorShop/brand.model.js';


// ─── Helpers ──────────────────────────────────────────────────────────────────
const applySourceFilter = (filter, section) => {
    if (section.sourceId) {
        filter._id = section.sourceId;
    }
    switch (section.sourceType) {
        case 'FEATURED': filter.isFeatured = true; break;
        case 'TOP_SELLING': filter.isTopSelling = true; break;
        case 'FLASH': filter.isFlashSale = true; break;
        case 'NEW_ARRIVALS': filter.createdAt = {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }; break;
    }
    return filter;
};

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolveBANNER = async (section) => {
    return Banner.find(
        applySourceFilter({ moduleId: section.moduleId, isActive: true }, section)
    )
        .sort({ order: 1 })
        .limit(section.limit)
        .select('image title redirectUrl order')
        .lean();
};

const resolvePRODUCT_LIST = async (section) => {
    return Product.find(
        applySourceFilter({ disable: false }, section)  // Product uses 'disable' field
    )
        .sort({ createdAt: -1 })
        .limit(section.limit)
        .select('name thumbnail slug brandId discount sold avgRating')
        .lean();
};

const resolveCATEGORY_LIST = async (section) => {
    return Pcategory.find(
        applySourceFilter({ moduleId: section.moduleId, isActive: true }, section)
    )
        .sort({ order: 1 })
        .limit(section.limit)
        .select('name image slug')
        .lean();
};


const resolveVENDOR_LIST = async (section) => {
    return VendorProfile.find(
        applySourceFilter({ disable: false, isAdminVerified: true }, section)
    )
        .sort({ createdAt: -1 })
        .limit(section.limit)
        .select('firstName lastName email isProfileCompleted isAdminVerified createdAt')
        .lean();
};

const resolveBRAND_LIST = async (section) => {
    return Brand.find(
        applySourceFilter({ status: 'active' }, section)  // Brand uses status:'active'
    )
        .sort({ order: 1 })
        .limit(section.limit)
        .select('name logo slug')
        .lean();
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// To add a new section type: add one line here. That's it.
export const sectionResolvers = {
    BANNER: resolveBANNER,
    PRODUCT_LIST: resolvePRODUCT_LIST,
    CATEGORY_LIST: resolveCATEGORY_LIST,
    VENDOR_LIST: resolveVENDOR_LIST,
    BRAND_LIST: resolveBRAND_LIST,
};
