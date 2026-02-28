import Joi from "joi";

export const createBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  moduleId: Joi.string().required(),
  pcategoryId: Joi.string().required(),
  categoryId: Joi.string().required(),
  subcategoryId: Joi.string().required(),
  logo: Joi.string().allow("", null),
  description: Joi.string().allow("", null),
  status: Joi.string().valid("active", "inactive"),
});

export const updateBrandSchema = createBrandSchema.fork(
  ["name", "moduleId", "pcategoryId", "categoryId", "subcategoryId"],
  (f) => f.optional()
);
