import Brand from "../../models/vendorShop/brand.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import productModel from "../../models/vendorShop/product.model.js";
import mongoose from "mongoose";
import { deleteFromS3 } from "../../middlewares/uploads.js";

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
  // static async getVendorBrands(req, res) {
  //   const { vendorId } = req.params;
  //   const { search } = req.query; //<-- brand name search

  //   const cacheKey = `brands:${vendorId}:${search || ""}`;
  //   const cached = await RedisCache.get(cacheKey);
  //   if (cached) return res.json(cached);

  //   const pipeline = [
  //     {
  //       $match: {
  //         vendorId: new mongoose.Types.ObjectId(vendorId),
  //         disable: false,
  //       },
  //     },

  //     {
  //       $group: {
  //         _id: "$brandId",
  //         totalProducts: { $sum: 1 },
  //       },
  //     },

  //     {
  //       $lookup: {
  //         from: "brands",
  //         localField: "_id",
  //         foreignField: "_id",
  //         as: "brand",
  //       },
  //     },
  //     { $unwind: "$brand" },

  //     {
  //       $match: {
  //         "brand.status": "active",
  //       },
  //     },
  //   ];
  //   //  Optional brand name filter
  //   if (search) {
  //     pipeline.push({
  //       $match: {
  //         "brand.name": { $regex: search, $options: "i" }, // case-insensitive
  //       },
  //     });
  //   }
  //   pipeline.push(
  //     {
  //       $project: {
  //         _id: 0,
  //         brandId: "$brand._id",
  //         name: "$brand.name",
  //         slug: "$brand.slug",
  //         logo: "$brand.logo",
  //         totalProducts: 1,
  //       },
  //     },
  //     {
  //       $sort: {
  //         totalProducts: -1,
  //       },
  //     },
  //   );

  //   const brands = await productModel.aggregate(pipeline);
  //   await RedisCache.set(cacheKey, brands);
  //   res.status(200).json({
  //     success: true,
  //     data: brands,
  //   });
  // }

  static async getVendorBrands(req, res) {
    try {
      const { vendorId } = req.params;
      const { search, type } = req.query;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "vendorId required",
        });
      }

      if (!type || !["BULK", "RETAIL"].includes(type.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: "Type must be BULK or RETAIL",
        });
      }

      const cacheKey = `brands:${vendorId}:${type}:${search || ""}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const pipeline = [
        // ✅ vendor products
        {
          $match: {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            disable: false,
          },
        },

        // ✅ VARIANT FILTER (IMPORTANT)
        {
          $lookup: {
            from: "variants",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                  disable: false,

                  // ✅ TYPE FILTER
                  Type: { $regex: `^${type}$`, $options: "i" },
                },
              },
              { $limit: 1 },
            ],
            as: "variant",
          },
        },

        // ✅ only valid products
        {
          $match: {
            variant: { $ne: [] },
          },
        },

        // ✅ group by brand
        {
          $group: {
            _id: "$brandId",
            totalProducts: { $sum: 1 },
          },
        },

        // ✅ brand lookup
        {
          $lookup: {
            from: "brands",
            localField: "_id",
            foreignField: "_id",
            as: "brand",
          },
        },
        { $unwind: "$brand" },

        // ✅ active brands only
        {
          $match: {
            "brand.status": "active",
          },
        },
      ];

      // ✅ search filter
      if (search) {
        pipeline.push({
          $match: {
            "brand.name": { $regex: search, $options: "i" },
          },
        });
      }

      // ✅ final response
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
          $sort: { totalProducts: -1 },
        },
      );

      const brands = await productModel.aggregate(pipeline);

      const response = {
        success: true,
        data: brands,
      };

      await RedisCache.set(cacheKey, response, 60);

      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
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
  // static async createBrand(req, res, next) {
  //   try {
  //     const brand = await Brand.create({
  //       ...req.body,
  //       createdBy: req.user?.id,
  //     });

  //     await RedisCache.deletePattern("brands:*");

  //     res.status(201).json({
  //       status: "success",
  //       message: "Brand created successfully",
  //       data: { brand },
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }
  static async createBrand(req, res, next) {
    try {
      const brand = await Brand.create({
        ...req.body,
        logo: req.file ? req.file.location : null, // 👈 S3 URL
        createdBy: req.user?.id,
      });

      await RedisCache.deletePattern("brands:*");
      await RedisCache.deletePattern("home:*");

      res.status(201).json({
        success: true,
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
      const existingBrand = await Brand.findById(req.params.id);
      if (!existingBrand) throw new APIError(404, "Brand not found");

      let updatedData = { ...req.body };

      if (req.file) {
        // 👉 OLD logo delete (optional but recommended)
        if (existingBrand.logo) {
          const oldKey = existingBrand.logo.split(".com/")[1]; // extract S3 key

          if (oldKey) {
            await deleteFromS3(oldKey); // 👈 tumhara helper function
          }
        }

        updatedData.logo = req.file.location;
      }

      const brand = await Brand.findByIdAndUpdate(req.params.id, updatedData, {
        new: true,
        runValidators: true,
      });

      await RedisCache.deletePattern("brands:*"); // 👈 better than single delete
      await RedisCache.delete(`brand:${req.params.id}`);
      await RedisCache.deletePattern("home:*");

      res.json({
        success: true,
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
      await RedisCache.deletePattern("brands:*");
      await RedisCache.deletePattern("home:*");

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
      await RedisCache.deletePattern("brands:*");
      await RedisCache.deletePattern("home:*");

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
