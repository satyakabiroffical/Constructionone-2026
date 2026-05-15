import { catchAsync, APIError } from "../../middlewares/errorHandler.js";
import * as FlashSaleService from "../../services/flashSale.service.js";
import FlashSale from "../../models/flashSale/flashSale.model.js";
import FlashSaleItem from "../../models/flashSale/flashSaleItem.model.js";
import { createFlashSaleSchema } from "../../validations/flashSale/flashSale.validation.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { buildStatusFilter } from "../../services/flashSale.service.js";
import RedisCache from "../../utils/redisCache.js";
import * as homeSectionService from "../../services/homeSection.service.js";

// POST /v1/admin/flash-sales
export const createFlashSale = catchAsync(async (req, res, next) => {
  const { error, value } = createFlashSaleSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return next(
      new APIError(400, error.details.map((d) => d.message).join(", ")),
    );
  }

  const { label, moduleId, vendorId, startDateTime, endDateTime, items } =
    value;

  const flashSale = await FlashSaleService.createFlashSale({
    label,
    moduleId,
    vendorId,
    startDateTime,
    endDateTime,
    items,
    createdBy: req.user.id,
  });
  await homeSectionService.invalidateHome(moduleId);

  res
    .status(201)
    .json(
      new ApiResponse(201, { flashSale }, "Flash sale created successfully"),
    );
});

export const updateFlashSaleController = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await FlashSaleService.updateFlashSale(id, req.body);
  const sale = await FlashSale.findById(id).select("moduleId").lean();
  if (sale) await homeSectionService.invalidateHome(sale.moduleId);
  res
    .status(200)
    .json(new ApiResponse(200, result, "Flash sale updated successfully"));
});

// PUT /v1/admin/flash-sales/:id/cancel
export const cancelFlashSale = catchAsync(async (req, res, next) => {
  const sale = await FlashSaleService.cancelFlashSale(req.params.id);
  await homeSectionService.invalidateHome(sale.moduleId);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { flashSale: sale },
        "Flash sale cancelled. Prices auto-reverted.",
      ),
    );
});

// GET /v1/admin/flash-sales-pradeep
// export const getAllFlashSales = catchAsync(async (req, res) => {
//   const { status, moduleId, vendorId, page = 1, limit = 20 } = req.query;

//   const filter = {
//     ...(status ? buildStatusFilter(status) : {}),
//     ...(moduleId ? { moduleId } : {}),
//     ...(vendorId ? { vendorId } : {}),
//   };

//   const skip = (Number(page) - 1) * Number(limit);

//   const [total, sales] = await Promise.all([
//     FlashSale.countDocuments(filter),
//     FlashSale.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .populate("moduleId", "title")
//       .populate("vendorId", "firstName lastName phoneNumber")
//       .populate("createdBy", "firstName lastName email")
//       .lean(),
//   ]);

//   const salesWithStatus = FlashSale.attachStatus(sales);

//   res.status(200).json(
//     new ApiResponse(
//       200,
//       { flashSales: salesWithStatus },
//       "Flash sales fetched successfully",
//       {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         pages: Math.ceil(total / Number(limit)),
//       },
//     ),
//   );
// });

//asgar
export const getAllFlashSales = catchAsync(async (req, res) => {
  const { status, moduleId, vendorId, page = 1, limit = 20 } = req.query;

  const filter = {
    ...(status ? buildStatusFilter(status) : {}),
    ...(moduleId ? { moduleId } : {}),
    ...(vendorId ? { vendorId } : {}),
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [total, sales] = await Promise.all([
    FlashSale.countDocuments(filter),

    FlashSale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("moduleId", "title")
      .populate("vendorId", "firstName lastName phoneNumber")
      .populate("createdBy", "firstName lastName email")
      .lean(),
  ]);

  const flashSaleIds = sales.map((s) => s._id);

  const items = await FlashSaleItem.find({
    flashSaleId: { $in: flashSaleIds },
  })
    .populate("productId", "name")
    .populate(
      "variantId",
      " moq Type price stock packageWeight packageDimensions",
    )
    .lean();

  const itemMap = {};
  items.forEach((item) => {
    const key = item.flashSaleId.toString();
    if (!itemMap[key]) itemMap[key] = [];
    itemMap[key].push(item);
  });

  const salesWithItems = sales.map((sale) => ({
    ...sale,
    items: itemMap[sale._id.toString()] || [],
  }));

  const finalSales = FlashSale.attachStatus(salesWithItems);

  res.status(200).json(
    new ApiResponse(
      200,
      { flashSales: finalSales },
      "Flash sales fetched successfully",
      {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    ),
  );
});

// GET /v1/admin/flash-sales/:id
export const getFlashSaleById = catchAsync(async (req, res, next) => {
  const sale = await FlashSale.findById(req.params.id)
    .populate("moduleId", "title")
    .populate("vendorId", "firstName lastName phoneNumber")
    .lean();

  if (!sale) return next(new APIError(404, "Flash sale not found"));

  const saleWithStatus = FlashSale.attachStatus(sale);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { flashSale: saleWithStatus },
        "Flash sale fetched successfully",
      ),
    );
});

// GET /v1/admin/flash-sales/:id/items
export const getFlashSaleItems = catchAsync(async (req, res) => {
  const items = await FlashSaleItem.find({ flashSaleId: req.params.id })
    .populate("productId", "name thumbnail images")
    .populate("variantId", "price mrp size Type stock")
    .lean();

  const enriched = items.map((item) => ({
    ...item,
    remainingStock: item.allocatedStock - item.sold,
    soldPercent: Math.round((item.sold / item.allocatedStock) * 100),
  }));

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { items: enriched },
        "Flash sale items fetched successfully",
        { total: items.length },
      ),
    );
});
