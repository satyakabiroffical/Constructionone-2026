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
import FlashSale from '../models/flashSale/flashSale.model.js';
import FlashSaleItem from '../models/flashSale/flashSaleItem.model.js';


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

/**
 * FLASH_SALE Resolver
 *
 * Kaam kaise karta hai:
 * 1. Pehle us module ki abhi ACTIVE chal rahi flash sale dhundta hai
 *    (current time startDateTime aur endDateTime ke beech ho)
 * 2. Phir us flash sale ke items fetch karta hai
 * 3. Har item mein product info, flash price, discount % aur
 *    remaining stock attach karta hai
 * 4. Agar koi active flash sale nahi — khali array return hota hai
 *    (home page break nahi hoga)
 */
const resolveFLASH_SALE = async (section) => {
    const now = new Date();

    // Step 1: Find the currently ACTIVE flash sale for this module
    const activeSale = await FlashSale.findOne({
        moduleId: section.moduleId,
        isCancelled: false,
        startDateTime: { $lte: now },   // already started
        endDateTime: { $gte: now },   // not yet ended
    })
        .select('_id label startDateTime endDateTime')
        .lean();

    // No active sale → return empty (section will be hidden by frontend)
    if (!activeSale) return [];

    // Step 2: Fetch flash sale items with product & variant info
    const items = await FlashSaleItem.find({ flashSaleId: activeSale._id })
        .limit(section.limit)
        .populate('productId', 'name thumbnail slug avgRating')  // product basic info
        .populate('variantId', 'mrp size Type')                  // variant info
        .lean();

    // Step 3: Enrich each item with calculated fields
    const enriched = items.map((item) => ({
        flashItemId: item._id,
        product: item.productId,         // name, thumbnail, slug, avgRating
        variant: item.variantId,          // mrp, size, type
        originalPrice: item.basePriceSnapshot,  // price before flash sale
        flashPrice: item.flashPrice,          // discounted price
        discountPercent: item.flashDiscountPercent, // e.g. 30 means 30% off
        discountAmount: item.basePriceSnapshot - item.flashPrice, // saved amount
        remainingStock: Math.max(item.allocatedStock - item.sold, 0), // items left
        soldPercent: Math.round((item.sold / item.allocatedStock) * 100), // progress bar
    }));

    // Step 4: Return alongside sale meta (for countdown timer on frontend)
    return {
        saleId: activeSale._id,
        saleLabel: activeSale.label,
        endsAt: activeSale.endDateTime,   // frontend uses this for countdown timer
        startsAt: activeSale.startDateTime,
        items: enriched,
    };
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// To add a new section type: add one line here. That's it.
export const sectionResolvers = {
    BANNER: resolveBANNER,
    PRODUCT_LIST: resolvePRODUCT_LIST,
    CATEGORY_LIST: resolveCATEGORY_LIST,
    VENDOR_LIST: resolveVENDOR_LIST,
    BRAND_LIST: resolveBRAND_LIST,
    FLASH_SALE: resolveFLASH_SALE,   // ← NEW: Flash sale section for home page
};
