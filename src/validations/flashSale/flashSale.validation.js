// src/validations/flashSale/flashSale.validation.js
import Joi from 'joi';

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Must be a valid MongoDB ObjectId');

// Single flash sale item (variant entry)
const flashSaleItemSchema = Joi.object({
    productId: objectId.required(),
    variantId: objectId.required(),
    flashDiscountPercent: Joi.number().min(1).max(99).required()
        .messages({ 'number.min': 'Discount must be at least 1%', 'number.max': 'Discount cannot exceed 99%' }),
    allocatedStock: Joi.number().integer().min(1).required(),
});

// Create flash sale payload
export const createFlashSaleSchema = Joi.object({
    label: Joi.string().trim().min(3).max(100).required(),
    moduleId: objectId.required(),
    vendorId: objectId.required(),
    startDateTime: Joi.date().iso().greater('now').required()
        .messages({ 'date.greater': 'startDateTime must be in the future' }),
    endDateTime: Joi.date().iso().greater(Joi.ref('startDateTime')).required()
        .messages({ 'date.greater': 'endDateTime must be after startDateTime' }),
    items: Joi.array().items(flashSaleItemSchema).min(1).required()
        .messages({ 'array.min': 'At least one variant item is required' }),
});
