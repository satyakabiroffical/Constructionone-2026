import Joi from "joi";

const addressSchema = Joi.object({
  fullAddress: Joi.string().trim().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
});

export const createVendorSchema = Joi.object({
  shopName: Joi.string().trim().min(2).required(),
  vendorName: Joi.string().trim().min(2).required(),
  address: addressSchema.required(),
  deliveryTime: Joi.string().valid("same_day", "4_6_hr").required(),
  shopImages: Joi.array().items(Joi.string().uri()).min(1).required(),
  badges: Joi.array()
    .items(Joi.string().valid("topVendor", "mostSeller", "fastDelivery"))
    .optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

export const vendorIdSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
});

export const updateVendorSchema = Joi.object({
  shopName: Joi.string().trim().min(2),
  vendorName: Joi.string().trim().min(2),
  address: addressSchema,
  deliveryTime: Joi.string().valid("same_day", "4_6_hr"),
  shopImages: Joi.array().items(Joi.string().uri()).min(1),
  badges: Joi.array().items(Joi.string().trim().min(1)).optional(),
  status: Joi.string().valid("active", "inactive"),
}).min(1);
