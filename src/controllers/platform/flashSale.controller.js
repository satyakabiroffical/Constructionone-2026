import { catchAsync, APIError } from '../../middlewares/errorHandler.js';
import FlashSale from '../../models/flashSale/flashSale.model.js';
import FlashSaleItem from '../../models/flashSale/flashSaleItem.model.js';
import { resolvePrice } from '../../services/pricing.service.js';

// ─── ACTIVE FLASH SALES (public) ─────────────────────────────────────────────
// GET /v1/flash-sales/active?moduleId=xxx
// Used by: Home Engine, Listing pages
export const getActiveFlashSales = catchAsync(async (req, res) => {
    const { moduleId } = req.query;
    const now = new Date();

    const filter = {
        status: 'ACTIVE',
        startDateTime: { $lte: now },
        endDateTime: { $gte: now },
    };
    if (moduleId) filter.moduleId = moduleId;

    const sales = await FlashSale.find(filter)
        .select('label moduleId startDateTime endDateTime')
        .populate('moduleId', 'name slug')
        .lean();

    res.json({ success: true, count: sales.length, data: sales });
});

// ─── FLASH SALE ITEMS (public listing) ───────────────────────────────────────
// GET /v1/flash-sales/:id/items
export const getFlashSalePublicItems = catchAsync(async (req, res, next) => {
    const sale = await FlashSale.findById(req.params.id)
        .select('label status startDateTime endDateTime')
        .lean();

    if (!sale) return next(new APIError(404, 'Flash sale not found'));
    if (sale.status !== 'ACTIVE') {
        return next(new APIError(400, 'This flash sale is not currently active'));
    }

    const items = await FlashSaleItem.find({
        flashSaleId: req.params.id,
        isActive: true,
    })
        .populate('productId', 'name images slug')
        .populate('variantId', 'mrp size Type')
        .lean();

    const enriched = items.map(item => ({
        flashItemId: item._id,
        product: item.productId,
        variant: item.variantId,
        basePriceSnapshot: item.basePriceSnapshot,
        flashPrice: item.flashPrice,
        discountPercent: item.flashDiscountPercent,
        discountAmount: item.basePriceSnapshot - item.flashPrice,
        remainingStock: Math.max(item.allocatedStock - item.sold, 0),
        soldPercent: Math.round((item.sold / item.allocatedStock) * 100),
    }));

    res.json({
        success: true,
        sale: {
            id: sale._id,
            label: sale.label,
            endsAt: sale.endDateTime,
        },
        count: enriched.length,
        data: enriched,
    });
});

// ─── RESOLVE PRICE FOR ANY VARIANT ───────────────────────────────────────────
// GET /v1/pricing/variant/:variantId
// Used by: Home listing, Product detail, Cart update, Checkout validation
export const getVariantPrice = catchAsync(async (req, res, next) => {
    const { variantId } = req.params;
    const pricing = await resolvePrice(variantId);
    res.json({ success: true, data: pricing });
});
