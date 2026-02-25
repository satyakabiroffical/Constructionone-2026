// src/services/flashSale.service.js
import FlashSale from '../models/flashSale/flashSale.model.js';
import FlashSaleItem from '../models/flashSale/flashSaleItem.model.js';
import Variant from '../models/vendorShop/variant.model.js';
import { invalidatePriceCache } from './pricing.service.js';
import redis from '../config/redis.config.js';

/**
 * Redis Lua script for atomic stock decrement.
 * - Returns -2 if the key does not exist in Redis (flash not initialised)
 * - Returns -1 if remaining stock < requested qty (exhausted)
 * - Returns new remaining stock on success
 *
 * This runs atomically inside Redis — no race condition possible
 * even with 1000 concurrent checkout requests.
 */
const LUA_DECREMENT = `
  local stock = redis.call('GET', KEYS[1])
  if not stock then return -2 end
  if tonumber(stock) < tonumber(ARGV[1]) then return -1 end
  return redis.call('DECRBY', KEYS[1], ARGV[1])
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a flash sale with variant line items.
 *
 * Process:
 *  1. Validate time window
 *  2. Conflict check — no variant can be in two active flash sales
 *  3. Validate allocatedStock <= Variant.stock
 *  4. Snapshot basePrice for each variant
 *  5. Compute flashPrice (stored, never in Variant)
 *  6. Create FlashSale header + FlashSaleItem documents
 */
export async function createFlashSale({
    label, moduleId, vendorId,
    startDateTime, endDateTime,
    items, // [{ productId, variantId, flashDiscountPercent, allocatedStock }]
    createdBy,
}) {
    // 1. Time window validation
    if (new Date(startDateTime) >= new Date(endDateTime)) {
        throw new Error('startDateTime must be before endDateTime');
    }
    if (new Date(startDateTime) < new Date()) {
        throw new Error('startDateTime must be in the future');
    }

    // 2. Conflict check — any variant already active in another flash?
    const variantIds = items.map(i => i.variantId);
    const conflict = await FlashSaleItem.findOne({
        variantId: { $in: variantIds },
        isActive: true,
    }).lean();

    if (conflict) {
        throw new Error(
            `CONFLICT: Variant ${conflict.variantId} is already in an active/upcoming flash sale`
        );
    }

    // 3. Fetch base data for all variants
    const variants = await Variant.find({ _id: { $in: variantIds } })
        .select('_id price stock')
        .lean();

    if (variants.length !== variantIds.length) {
        throw new Error('One or more variant IDs are invalid');
    }

    const variantMap = Object.fromEntries(variants.map(v => [v._id.toString(), v]));

    // 4. Validate allocated stock
    for (const item of items) {
        const v = variantMap[item.variantId.toString()];
        if (!v) throw new Error(`Variant ${item.variantId} not found`);
        if (item.allocatedStock > v.stock) {
            throw new Error(
                `Variant ${item.variantId}: allocatedStock (${item.allocatedStock}) exceeds available stock (${v.stock})`
            );
        }
    }

    // 5. Create FlashSale header
    const flashSale = await FlashSale.create({
        label, moduleId, vendorId,
        startDateTime, endDateTime,
        status: 'UPCOMING',
        createdBy,
    });

    // 6. Build and insert FlashSaleItem documents
    const itemDocs = items.map(item => {
        const basePrice = variantMap[item.variantId.toString()].price;
        const flashPrice = Math.max(
            Math.round(basePrice - (basePrice * item.flashDiscountPercent) / 100),
            1
        );

        return {
            flashSaleId: flashSale._id,
            productId: item.productId,
            variantId: item.variantId,
            basePriceSnapshot: basePrice,
            flashDiscountPercent: item.flashDiscountPercent,
            flashPrice,
            allocatedStock: item.allocatedStock,
            sold: 0,
            isActive: true,
        };
    });

    await FlashSaleItem.insertMany(itemDocs);

    return flashSale;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activate a flash sale.
 * - Sets status → ACTIVE
 * - Initialises Redis stock counters for atomic checkout decrement
 * - Invalidates price cache for all variants (forces fresh resolvePrice)
 *
 * Can be called manually by admin OR by a cron job at startDateTime.
 */
export async function activateFlashSale(flashSaleId) {
    const sale = await FlashSale.findById(flashSaleId);
    if (!sale) throw new Error('Flash sale not found');
    if (sale.status !== 'UPCOMING') {
        throw new Error(`Cannot activate a sale with status "${sale.status}"`);
    }

    sale.status = 'ACTIVE';
    await sale.save();

    // Fetch all items and initialise Redis stock keys
    const items = await FlashSaleItem.find({ flashSaleId, isActive: true }).lean();

    await Promise.all(
        items.map(async item => {
            const remaining = item.allocatedStock - item.sold;
            const key = `flash:stock:${item._id}`;

            // TTL = duration of flash sale in seconds
            const ttlSecs = Math.ceil(
                (new Date(sale.endDateTime) - new Date()) / 1000
            );

            await redis.set(key, remaining, 'EX', ttlSecs > 0 ? ttlSecs : 3600);

            // Bust price cache → next resolvePrice() call sees flash price
            await invalidatePriceCache(item.variantId);
        })
    );

    return sale;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRE (COMPLETE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expire / complete a flash sale.
 *
 * HOW AUTO-REVERT WORKS:
 *  1. FlashSale.status → COMPLETED
 *  2. FlashSaleItem.isActive → false (for all items)
 *  3. Redis price cache deleted for each variant
 *  4. Next resolvePrice(variantId) call:
 *     - Cache miss
 *     - FlashSaleItem.findOne({ variantId, isActive: true }) → null
 *     - Falls through to "Normal Price" block
 *     - Returns Variant.price (which was NEVER modified)
 *  → Price reverts automatically, zero reset code needed
 */
export async function expireFlashSale(flashSaleId) {
    const sale = await FlashSale.findById(flashSaleId);
    if (!sale) throw new Error('Flash sale not found');
    if (sale.status === 'COMPLETED' || sale.status === 'CANCELLED') {
        throw new Error(`Sale is already ${sale.status}`);
    }

    sale.status = 'COMPLETED';
    await sale.save();

    await _deactivateItems(flashSaleId);
    return sale;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin cancel — works for UPCOMING or ACTIVE sales.
 */
export async function cancelFlashSale(flashSaleId) {
    const sale = await FlashSale.findById(flashSaleId);
    if (!sale) throw new Error('Flash sale not found');
    if (sale.status === 'COMPLETED') {
        throw new Error('Cannot cancel an already completed sale');
    }

    sale.status = 'CANCELLED';
    await sale.save();

    await _deactivateItems(flashSaleId);
    return sale;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMIC CHECKOUT STOCK LOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomically decrement flash sale stock in Redis at checkout.
 * Syncs sold count to MongoDB asynchronously (non-blocking).
 *
 * Throws:
 *  - 'FLASH_STOCK_EXHAUSTED' — not enough units available
 *  - 'FLASH_ITEM_NOT_IN_REDIS' — Redis key missing (sale not active)
 */
export async function lockFlashStock(flashItemId, qty = 1) {
    const key = `flash:stock:${flashItemId}`;

    const result = await redis.eval(
        LUA_DECREMENT,
        1,          // number of keys
        key,        // KEYS[1]
        String(qty) // ARGV[1]
    );

    if (result === -2) throw new Error('FLASH_ITEM_NOT_IN_REDIS');
    if (result === -1) throw new Error('FLASH_STOCK_EXHAUSTED');

    // Fire-and-forget DB sync (non-blocking — does not delay checkout response)
    setImmediate(() => {
        FlashSaleItem.findByIdAndUpdate(flashItemId, { $inc: { sold: qty } })
            .catch(err => console.error('[FlashSale] sold sync error:', err.message));
    });

    return result; // remaining stock after decrement
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function _deactivateItems(flashSaleId) {
    const items = await FlashSaleItem.find({ flashSaleId }).lean();

    await Promise.all(
        items.map(async item => {
            // Deactivate item so resolvePrice() auto-reverts
            await FlashSaleItem.findByIdAndUpdate(item._id, { isActive: false });

            // Remove Redis stock key
            await redis.del(`flash:stock:${item._id}`);

            // Bust price cache → next resolvePrice() returns base Variant.price
            await invalidatePriceCache(item.variantId);
        })
    );
}
