import { catchAsync, APIError } from '../../middlewares/errorHandler.js';
import FlashSale from '../../models/flashSale/flashSale.model.js';
import FlashSaleItem from '../../models/flashSale/flashSaleItem.model.js';
import { resolvePrice } from '../../services/pricing.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// GET /v1/flash-sales/active
export const getActiveFlashSales = catchAsync(async (req, res) => {
    const { moduleId } = req.query;
    const now = new Date();

    const filter = {
        isCancelled: false,
        startDateTime: { $lte: now },
        endDateTime: { $gte: now },
    };
    if (moduleId) filter.moduleId = moduleId;

    const sales = await FlashSale.find(filter)
        .select('label moduleId startDateTime endDateTime')
        .populate('moduleId', 'title slug')
        .lean();

    const salesWithStatus = FlashSale.attachStatus(sales);

    res.status(200).json(
        new ApiResponse(200, { flashSales: salesWithStatus }, 'Active flash sales fetched successfully', { total: sales.length })
    );
});

// GET /v1/flash-sales/:id/items
export const getFlashSalePublicItems = catchAsync(async (req, res, next) => {
    const sale = await FlashSale.findById(req.params.id)
        .select('label startDateTime endDateTime isCancelled')
        .lean();

    if (!sale) return next(new APIError(404, 'Flash sale not found'));

    const status = FlashSale.computeStatus(sale);
    if (status !== 'ACTIVE') {
        return next(new APIError(400, `Flash sale is ${status} — not currently active`));
    }

    const items = await FlashSaleItem.find({ flashSaleId: req.params.id })
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

    res.status(200).json(
        new ApiResponse(
            200,
            {
                sale: { id: sale._id, label: sale.label, status, startsAt: sale.startDateTime, endsAt: sale.endDateTime },
                items: enriched,
            },
            'Flash sale items fetched successfully',
            { total: enriched.length }
        )
    );
});

// GET /v1/pricing/variant/:variantId
export const getVariantPrice = catchAsync(async (req, res) => {
    const pricing = await resolvePrice(req.params.variantId);
    res.status(200).json(
        new ApiResponse(200, { pricing }, 'Variant price resolved successfully')
    );
});
