import Variant from "../../models/vendorShop/variant.model.js"; //Sanvi
import mongoose from "mongoose";

import RedisCache from "../../utils/redisCache.js";
import Product from "../../models/vendorShop/product.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import { checkVariantExists } from "../../utils/variantCheck.js";
import { calculateDiscount } from "../../utils/priceCalculator.js";

class VariantController {
  static async getVariants(req, res, next) {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limitRaw = parseInt(req.query.limit) || 20;
      const limit = Math.min(limitRaw, 50);
      const skip = (page - 1) * limit;

      const allowedFilters = [
        "productId",
        "moduleId",
        "pcategoryId",
        "categoryId",
        "subcategoryId",
        "brandId",
        "Type",
        "disable",
      ];

      const filter = {};

      for (const field of allowedFilters) {
        if (req.query[field] !== undefined) {
          filter[field] = req.query[field];
        }
      }

      const cacheKey = `variants:v2:${Buffer.from(
        JSON.stringify({ f: filter, p: page, l: limit }),
      ).toString("base64")}`;

      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const [variants, total] = await Promise.all([
        Variant.find(filter, {
          productId: 1,
          price: 1,
          mrp: 1,
          discount: 1,
          discountAmount: 1,
          size: 1,
          stock: 1,
          sold: 1,
          Type: 1,
          disable: 1,
          createdAt: 1,
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .populate("productId", "name")
          .lean(),

        Variant.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      const result = {
        status: "success",
        message: "Variants retrieved successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        results: variants.length,
        data: { variants },
      };

      await RedisCache.set(cacheKey, result, 300);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async addVariant(req, res, next) {
    try {
      const { productId, ...variantData } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        throw new APIError("Product not found", 404);
      }

      if (String(product.vendorId) !== String(req.user.id)) {
        throw new APIError(
          "You are not allowed to add variant to this product",
          403,
        );
      }
      //  duplicate check
      const exists = await checkVariantExists({
        productId,
        size: variantData.size,
        Type: variantData.Type,
      });

      if (exists) {
        throw new APIError(
          "Variant with same size and type already exists",
          400,
        );
      }

      const mrp = Number(variantData.mrp || 0);
      const discount = Number(variantData.discount || 0);
      const { price, discountAmount } = calculateDiscount(mrp, discount);

      const variant = await Variant.create({
        ...variantData,
        price,
        discountAmount,

        productId: product._id,
        moduleId: product.moduleId,
        pcategoryId: product.pcategoryId,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        brandId: product.brandId,

        // vendorId: product.vendorId,
      });

      await RedisCache.deletePattern?.("products:*");
      await RedisCache.deletePattern?.("variants:*");
      await RedisCache.deletePattern?.(`product:v1:${productId}:variants:*`);

      res.status(201).json({
        status: "success",
        message: "Variant added successfully",
        data: { variant },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getVariantById(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new APIError("Invalid variant id", 400);
      }

      const cacheKey = `variant:v1:${id}`;

      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const variant = await Variant.findById(id, {
        productId: 1,
        price: 1,
        mrp: 1,
        discount: 1,
        discountAmount: 1,
        size: 1,
        stock: 1,
        sold: 1,
        Type: 1,
        disable: 1,
        moq: 1,
        packageWeight: 1,
        packageDimensions: 1,
        createdAt: 1,
      }).lean();

      if (!variant) {
        throw new APIError("Variant not found", 404);
      }

      const result = {
        status: "success",
        message: "Variant fetched successfully",
        data: { variant },
      };

      await RedisCache.set(cacheKey, result, 300);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateVariant(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const variant = await Variant.findById(id);
      if (!variant) {
        throw new APIError("Variant not found", 404);
      }
      const product = await Product.findById(variant.productId).select(
        "vendorId",
      );

      if (String(product.vendorId) !== String(req.user.id)) {
        throw new APIError("You are not allowed to update this variant", 403);
      }

      // duplicate check if size or Type is changing
      if (updateData.size !== undefined || updateData.Type !== undefined) {
        const size = updateData.size ?? variant.size;
        const Type = updateData.Type ?? variant.Type;

        const exists = await Variant.findOne({
          _id: { $ne: id },
          productId: variant.productId,
          size,
          Type,
          disable: false,
        }).lean();

        if (exists) {
          throw new APIError(
            "Variant with same size and type already exists",
            400,
          );
        }
      }

      // recalculate price if mrp or discount updated
      if (updateData.mrp !== undefined || updateData.discount !== undefined) {
        const mrp = Number(updateData.mrp ?? variant.mrp ?? 0);
        const discount = Number(updateData.discount ?? variant.discount ?? 0);

        const { price, discountAmount } = calculateDiscount(mrp, discount);

        updateData.price = price;
        updateData.discountAmount = discountAmount;
      }

      const updatedVariant = await Variant.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      // cache clear
      await RedisCache.deletePattern?.("variants:*");
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.deletePattern?.(
        `product:v1:${variant.productId}:variants:*`,
      );

      res.json({
        status: "success",
        message: "Variant updated successfully",
        data: { variant: updatedVariant },
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleVariantStatus(req, res, next) {
    try {
      const { id } = req.params;

      const variant = await Variant.findById(id);
      if (!variant) {
        throw new APIError("Variant not found", 404);
      }

      variant.disable = !variant.disable;
      await variant.save();

      await RedisCache.deletePattern?.("variants:*");
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.deletePattern?.(
        `product:v1:${variant.productId}:variants:*`,
      );

      res.json({
        status: "success",
        message: `Variant ${variant.disable ? "disabled" : "enabled"} successfully`,
        data: { variant },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteVariant(req, res, next) {
    try {
      const { id } = req.params;

      const variant = await Variant.findByIdAndDelete(id);

      if (!variant) {
        throw new APIError("Variant not found", 404);
      }

      await RedisCache.deletePattern?.("variants:*");
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.deletePattern?.(
        `product:v1:${variant.productId}:variants:*`,
      );

      res.json({
        status: "success",
        message: "Variant deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

export default VariantController;
