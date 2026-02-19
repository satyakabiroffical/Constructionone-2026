import Variant from "../../models/vendorShop/variant.model.js";
import RedisCache from "../../utils/redisCache.js";

class VariantController {
  static async getVariants(req, res, next) {
    try {
      const cacheKey = `variants:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const variants = await Variant.find(req.query).populate(
        "productId",
        "name",
      );

      
      const result = {
        status: "success",
        message: "Variants retrieved successfully",
        results: variants.length,
        data: { variants },
      };

      await RedisCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createVariant(req, res, next) {
    try {
      const variant = await Variant.create({
        ...req.body,
        createdBy: req.user?.id,
      });

      await RedisCache.delete("variants:");

      res.status(201).json({
        status: "success",
        message: "Variant created successfully",
        data: { variant },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default VariantController;
