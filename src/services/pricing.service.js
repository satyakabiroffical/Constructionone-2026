// src/services/pricing.service.js
import Variant from '../models/vendorShop/variant.model.js';
import FlashSaleItem from '../models/flashSale/flashSaleItem.model.js';
import RedisCache from '../utils/redisCache.js';

const CACHE_TTL_DEFAULT = 300; // 5 min when no flash rule

/**
 * Resolve the final price for a variant.
 *
 * Priority:
 *   1. Redis cache hit → return immediately
 *   2. Active FlashSaleItem found → return flashPrice
 *   3. No flash → return Variant.price (base, untouched)
 *
 * Cache TTL:
 *   - Flash active: TTL = seconds until flashSale.endDateTime
 *   - No flash: TTL = 5 minutes
 *
 * Auto-revert logic:
 *   When a flash sale expires, FlashSaleItem.isActive is set to false
 *   and the price cache is deleted. The next call here finds no active
 *   FlashSaleItem and falls back to Variant.price automatically.
 *   Variant.price is NEVER modified.
 */
export async function resolvePrice(variantId) {
    const cacheKey = `price:v1:${variantId}`;

    // 1. Redis cache hit
    const cached = await RedisCache.get(cacheKey);
    if (cached) return cached;

    // 2. Fetch variant base data
    const variant = await Variant.findById(variantId)
        .select('price mrp stock')
        .lean();

    if (!variant) throw new Error('VARIANT_NOT_FOUND');

    const now = new Date();

    // 3. Check for an active flash item for this variant
    const flashItem = await FlashSaleItem.findOne({ variantId, isActive: true })
        .populate({
            path: 'flashSaleId',
            select: 'status startDateTime endDateTime moduleId label',
            match: {
                status: 'ACTIVE',
                startDateTime: { $lte: now },
                endDateTime: { $gte: now },
            },
        })
        .lean();

    let result;

    if (flashItem && flashItem.flashSaleId) {
        // ── Flash Sale Active ─────────────────────────────────────────────────────
        const remaining = flashItem.allocatedStock - flashItem.sold;

        result = {
            variantId: variantId.toString(),
            basePrice: variant.price,
            mrp: variant.mrp,
            finalPrice: flashItem.flashPrice,
            discountPercent: flashItem.flashDiscountPercent,
            discountAmount: variant.price - flashItem.flashPrice,
            isFlashSale: true,
            flashSaleId: flashItem.flashSaleId._id.toString(),
            flashItemId: flashItem._id.toString(),
            flashSaleLabel: flashItem.flashSaleId.label,
            flashStock: Math.max(remaining, 0),
            flashEndsAt: flashItem.flashSaleId.endDateTime,
        };

        // TTL = seconds until flash ends (min 60s buffer)
        const ttl = Math.max(
            Math.floor((new Date(flashItem.flashSaleId.endDateTime) - now) / 1000),
            60
        );
        await RedisCache.set(cacheKey, result, ttl);
    } else {
        // ── Normal Price (no active flash) ────────────────────────────────────────
        result = {
            variantId: variantId.toString(),
            basePrice: variant.price,
            mrp: variant.mrp,
            finalPrice: variant.price,
            discountPercent: 0,
            discountAmount: 0,
            isFlashSale: false,
            flashSaleId: null,
            flashItemId: null,
            flashSaleLabel: null,
            flashStock: null,
            flashEndsAt: null,
        };

        await RedisCache.set(cacheKey, result, CACHE_TTL_DEFAULT);
    }

    return result;
}

/**
 * Delete the price cache for a variant.
 * Call this whenever flash sale state changes for this variant.
 */
export async function invalidatePriceCache(variantId) {
    await RedisCache.delete(`price:v1:${variantId}`);
}
