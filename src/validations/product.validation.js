import Joi from "joi";
import { createVariantSchema } from "../validations/variant.validation.js";

export const createProductWithVariantSchema = Joi.object({
   name: Joi.string().required(),
  price: Joi.number().optional(),
  stock: Joi.number().optional(),
  sku: Joi.string().allow("", null),

  // ✅ DO NOT require auto-injected fields
  moduleId: Joi.string().optional(),
  pcategoryId: Joi.string().optional(),
  categoryId: Joi.string().optional(),
  subcategoryId: Joi.string().optional(),
  brandId: Joi.string().optional(),
  productId: Joi.string().optional(),
});
