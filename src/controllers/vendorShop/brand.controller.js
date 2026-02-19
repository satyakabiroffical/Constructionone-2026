import Brand from "../../models/vendorShop/brand.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";

class BrandController {
  static async getBrands(req, res, next) {
    try {
      const cacheKey = `brands:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const { page = 1, limit = 20, sort = "-createdAt" } = req.query;

      const query = { ...req.query };
      ["page", "limit", "sort"].forEach((f) => delete query[f]);

      const brands = await Brand.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const result = {
        status: "success",
        message: "Brands retrieved successfully",
        results: brands.length,
        data: { brands },
      };

      await RedisCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getBrand(req, res, next) {
    try {
      const cacheKey = `brand:${req.params.id}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const brand = await Brand.findById(req.params.id);
      if (!brand) throw new APIError(404, "Brand not found");

      const result = {
        status: "success",
        message: "Brand retrieved successfully",
        data: { brand },
      };

      await RedisCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createBrand(req, res, next) {
    try {
      const brand = await Brand.create({
        ...req.body,
        createdBy: req.user?.id,
      });

      await RedisCache.delete("brands:");

      res.status(201).json({
        status: "success",
        message: "Brand created successfully",
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateBrand(req, res, next) {
    try {
      const brand = await Brand.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!brand) throw new APIError(404, "Brand not found");

      await RedisCache.delete("brands:");
      await RedisCache.delete(`brand:${req.params.id}`);

      res.json({
        status: "success",
        message: "Brand updated successfully",
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteBrand(req, res, next) {
    try {
      const brand = await Brand.findByIdAndDelete(req.params.id);
      if (!brand) throw new APIError(404, "Brand not found");

      await RedisCache.delete("brands:");
      await RedisCache.delete(`brand:${req.params.id}`);

      res.json({
        status: "success",
        message: "Brand deleted successfully",
        data: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default BrandController;
