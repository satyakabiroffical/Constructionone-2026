import Joi from "joi";
import { createVariantSchema } from "../validations/variant.validation.js";

export const createProductWithVariantSchema = Joi.object({
  productData: Joi.object({
    name: Joi.string().required(),
    moduleId: Joi.string().required(),
    pcategoryId: Joi.string().required(),
    categoryId: Joi.string().required(),
    subcategoryId: Joi.string().required(),
    brandId: Joi.string().required(),
    description: Joi.string().allow("", null),
    images: Joi.array().items(Joi.string()),
    status: Joi.string().valid("active", "inactive"),
  }).required(),

  //  IMPORTANT
  variantData: createVariantSchema.required(),
});
