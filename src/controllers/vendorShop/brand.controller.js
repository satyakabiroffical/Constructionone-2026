import Brand from "../../models/vendorShop/brand.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import productModel from "../../models/vendorShop/product.model.js";
import mongoose from "mongoose";

class BrandController {
  //  GET ALL
  static async getBrands(req, res, next) {
    try {
      const cacheKey = `brands:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const {
        page = 1,
        limit = 20,
        sort = "-createdAt",
        status,
        moduleId,
        categoryId,
        subcategoryId,
        pcategoryId,
        search,
      } = req.query;

      const filter = {};

      if (status) filter.status = status;
      if (moduleId) filter.moduleId = moduleId;
      if (pcategoryId) filter.pcategoryId = pcategoryId;
      if (categoryId) filter.categoryId = categoryId;
      if (subcategoryId) filter.subcategoryId = subcategoryId;

      // search by name
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      const skip = (page - 1) * limit;

      const [brands, total] = await Promise.all([
        Brand.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
        Brand.countDocuments(filter),
      ]);

      const result = {
        status: "success",
        message: "Brands retrieved successfully",
        results: brands.length,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
        data: { brands },
      };

      await RedisCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  //get brand for vendor shop profiles
  static async getVendorBrands(req, res) {
    const { vendorId } = req.params;
    const { search } = req.query; //<-- brand name search
    const cacheKey = `brands:${vendorId}:${search || ""}`;

    const cached = await RedisCache.get(cacheKey);
    if (cached) return res.json(cached);

    const pipeline = [
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          disable: false,
        },
      },

      {
        $group: {
          _id: "$brandId",
          totalProducts: { $sum: 1 },
        },
      },

      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      {
        $match: {
          "brand.status": "active",
        },
      },
    ];
    // 🔍 Optional brand name filter
    if (search) {
      pipeline.push({
        $match: {
          "brand.name": { $regex: search, $options: "i" }, // case-insensitive
        },
      });
    }
    pipeline.push(
      {
        $project: {
          _id: 0,
          brandId: "$brand._id",
          name: "$brand.name",
          slug: "$brand.slug",
          logo: "$brand.logo",
          totalProducts: 1,
        },
      },
      {
        $sort: {
          totalProducts: -1,
        },
      },
    );

    const brands = await productModel.aggregate(pipeline);
    await RedisCache.set(cacheKey, brands);
    res.status(200).json({
      success: true,
      data: brands,
    });
  }
  //  GET ONE
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

  //  CREATE
  static async createBrand(req, res, next) {
    try {
      const brand = await Brand.create({
        ...req.body,
        createdBy: req.user?.id,
      });

      await RedisCache.deletePattern("brands:*");

      res.status(201).json({
        status: "success",
        message: "Brand created successfully",
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  }

  //  UPDATE
  static async updateBrand(req, res, next) {
    try {
      const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

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

  //  DELETE (hard delete — change to soft if needed)
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

  //   TOGGLE STATUS
  static async toggleBrandStatus(req, res, next) {
    try {
      const brand = await Brand.findById(req.params.id);
      if (!brand) throw new APIError(404, "Brand not found");

      brand.status = brand.status === "active" ? "inactive" : "active";
      await brand.save();

      await RedisCache.delete("brands:");
      await RedisCache.delete(`brand:${req.params.id}`);

      res.json({
        status: "success",
        message: `Brand ${
          brand.status === "active" ? "enabled" : "disabled"
        } successfully`,
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default BrandController;
