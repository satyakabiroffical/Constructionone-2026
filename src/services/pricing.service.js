import Variant from '../models/vendorShop/variant.model.js';
import FlashSale from '../models/flashSale/flashSale.model.js';
import FlashSaleItem from '../models/flashSale/flashSaleItem.model.js';
import RedisCache from '../utils/redisCache.js';

const CACHE_TTL_DEFAULT = 300;

export async function resolvePrice(variantId) {
    const cacheKey = `price:v1:${variantId}`;

    const cached = await RedisCache.get(cacheKey);
    if (cached) return cached;

    const variant = await Variant.findById(variantId)
        .select('price mrp stock')
        .lean();

    if (!variant) throw new Error('VARIANT_NOT_FOUND');

    const now = new Date();

    const activeFlashSales = await FlashSale.find({
        isCancelled: false,
        startDateTime: { $lte: now },
        endDateTime: { $gte: now },
    }).select('_id label endDateTime').lean();

    let flashItem = null;
    if (activeFlashSales.length > 0) {
        const activeSaleIds = activeFlashSales.map(s => s._id);
        flashItem = await FlashSaleItem.findOne({
            variantId,
            flashSaleId: { $in: activeSaleIds },
        }).lean();
    }

    let result;

    if (flashItem) {
        const sale = activeFlashSales.find(s => s._id.toString() === flashItem.flashSaleId.toString());
        const remaining = flashItem.allocatedStock - flashItem.sold;

        result = {
            variantId: variantId.toString(),
            basePrice: variant.price,
            mrp: variant.mrp,
            finalPrice: flashItem.flashPrice,
            discountPercent: flashItem.flashDiscountPercent,
            discountAmount: variant.price - flashItem.flashPrice,
            isFlashSale: true,
            flashSaleId: flashItem.flashSaleId.toString(),
            flashItemId: flashItem._id.toString(),
            flashSaleLabel: sale?.label || null,
            flashStock: Math.max(remaining, 0),
            flashEndsAt: sale?.endDateTime || null,
        };

        const ttl = Math.max(Math.floor((new Date(sale.endDateTime) - now) / 1000), 60);
        await RedisCache.set(cacheKey, result, ttl);
    } else {
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

export async function invalidatePriceCache(variantId) {
    await RedisCache.delete(`price:v1:${variantId}`);
}
