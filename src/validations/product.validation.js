

import Joi from "joi";
import { createVariantSchema } from "../validations/variant.validation.js";

export const createProductWithVariantSchema = Joi.object({
  // =========================
  // PRODUCT FIELDS
  // =========================

  name: Joi.string().required(),

  moduleId: Joi.string().required(),

  pcategoryId: Joi.string().required(),

  categoryId: Joi.string().required(),

  // multiple subcategory support
  subcategoryId: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      "array.base": "subcategoryId must be an array",
      "array.min": "At least one subcategory is required",
      "any.required": "subcategoryId is required",
    }),

  // multiple product type support
  productTypeId: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      "array.base": "productTypeId must be an array",
      "array.min": "At least one product type is required",
      "any.required": "productTypeId is required",
    }),

  brandId: Joi.string().required(),

  description: Joi.string().allow("", null),

  features: Joi.string().allow("", null),

  sku: Joi.string().allow("", null),

  measurementUnit: Joi.string().allow("", null),

  leadTime: Joi.string().allow("", null),

  deliveryCharges: Joi.string()
    .valid("free", "distanceWeightVolumeBased")
    .optional(),

  // shippingCharges: Joi.object({
  //   fixed: Joi.number().optional(),
  //   distancePerKm: Joi.number().optional(),
  //   weightPerKg: Joi.number().optional(),
  // }).optional(),

  warrantyPeriod: Joi.string().allow("", null),

  safetyInstructions: Joi.string().allow("", null),

  specification: Joi.string().allow("", null),

  status: Joi.string().valid("DRAFT", "ACTIVE", "OUT_OF_STOCK").optional(),

  // =========================
  // VARIANTS
  // =========================

  // variants: Joi.array().items(createVariantSchema).min(1).required().messages({
  //   "array.base": "variants must be an array",
  //   "array.min": "At least one variant is required",
  //   "any.required": "variants are required",
  // }),
});
