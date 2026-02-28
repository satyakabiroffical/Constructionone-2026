// src/controllers/admin/flashSale.controller.js
import { catchAsync, APIError } from "../../middlewares/errorHandler.js";
import * as FlashSaleService from "../../services/flashSale.service.js";
import FlashSale from "../../models/flashSale/flashSale.model.js";
import FlashSaleItem from "../../models/flashSale/flashSaleItem.model.js";
import { createFlashSaleSchema } from "../../validations/flashSale/flashSale.validation.js";

// ─── CREATE ──────────────────────────────────────────────────────────────────
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

  res.status(201).json({
    success: true,
    message: "Flash sale created successfully",
    data: flashSale,
  });
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
// PUT /v1/admin/flash-sales/:id/activate

export const activateFlashSale = catchAsync(async (req, res, next) => {
  const sale = await FlashSaleService.activateFlashSale(req.params.id);
  res.json({
    success: true,
    message: "Flash sale activated successfully",
    data: sale,
  });
});

// ─── EXPIRE ──────────────────────────────────────────────────────────────────
// PUT /v1/admin/flash-sales/:id/expire
export const expireFlashSale = catchAsync(async (req, res, next) => {
  const sale = await FlashSaleService.expireFlashSale(req.params.id);
  res.json({
    success: true,
    message:
      "Flash sale marked as completed. All variant prices auto-reverted.",
    data: sale,
  });
});

// ─── CANCEL ──────────────────────────────────────────────────────────────────
// PUT /v1/admin/flash-sales/:id/cancel
export const cancelFlashSale = catchAsync(async (req, res, next) => {
  const sale = await FlashSaleService.cancelFlashSale(req.params.id);
  res.json({
    success: true,
    message: "Flash sale cancelled. All variant prices auto-reverted.",
    data: sale,
  });
});

// ─── LIST ALL ─────────────────────────────────────────────────────────────────
// GET /v1/admin/flash-sales
export const getAllFlashSales = catchAsync(async (req, res) => {
  const { status, moduleId, vendorId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (moduleId) filter.moduleId = moduleId;
  if (vendorId) filter.vendorId = vendorId;

  const skip = (Number(page) - 1) * Number(limit);

  const [total, sales] = await Promise.all([
    FlashSale.countDocuments(filter),
    FlashSale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("moduleId", "name")
      .populate("vendorId", "firstName lastName phoneNumber")
      .populate("createdBy", "firstName lastName email")
      .lean(),
  ]);

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: sales,
  });
});

// ─── GET SINGLE ───────────────────────────────────────────────────────────────
// GET /v1/admin/flash-sales/:id
export const getFlashSaleById = catchAsync(async (req, res, next) => {
  const sale = await FlashSale.findById(req.params.id)
    .populate("moduleId", "name")
    .populate("vendorId", "firstName lastName phoneNumber")
    .lean();

  if (!sale) return next(new APIError(404, "Flash sale not found"));

  res.json({ success: true, data: sale });
});

// ─── GET ITEMS ────────────────────────────────────────────────────────────────
// GET /v1/admin/flash-sales/:id/items
export const getFlashSaleItems = catchAsync(async (req, res) => {
  const items = await FlashSaleItem.find({ flashSaleId: req.params.id })
    .populate("productId", "name images")
    .populate("variantId", "price mrp size Type stock")
    .lean();

  const enriched = items.map((item) => ({
    ...item,
    remainingStock: item.allocatedStock - item.sold,
    soldPercent: Math.round((item.sold / item.allocatedStock) * 100),
  }));

  res.json({ success: true, count: items.length, data: enriched });
});
