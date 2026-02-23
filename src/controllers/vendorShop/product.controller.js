import mongoose from "mongoose"; //Sanvi
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import { calculateDiscount } from "../../utils/priceCalculator.js";

class ProductController {
  static async getProducts(req, res, next) {
    try {
      //  versioned cache key (important)

      const cacheKey = `products:v1:${JSON.stringify(req.query)}`;

      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const { page = 1, limit = 20, sort = "-createdAt" } = req.query;

      //  SAFE FILTER BUILD

      const query = {};

      const allowedFilters = [
        "moduleId",
        "pcategoryId",
        "categoryId",
        "subcategoryId",
        "brandId",
        "disable",
        "varified",
      ];

      allowedFilters.forEach((field) => {
        if (req.query[field] !== undefined) {
          query[field] = req.query[field];
        }
      });

      //  FAST QUERY

      const products = await Product.find(query)
        .populate("brandId", "name")
        .populate("defaultVariantId")
        .sort(sort)
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .lean(); //  BIG PERFORMANCE BOOST

      const result = {
        status: "success",
        message: "Products retrieved successfully ",
        results: products.length,
        data: { products },
      };

      //  cache result
      await RedisCache.set(cacheKey, result);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
  //  CREATE PRODUCT

  //  static async createProduct(req, res, next) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     // UPDATED — PARSE multipart JSON
  //     let { productData, variants } = req.body;

  //     if (typeof productData === "string") {
  //       productData = JSON.parse(productData);
  //     }

  //     if (typeof variants === "string") {
  //       variants = JSON.parse(variants);
  //     }

  //     //  UPDATED — VALIDATION
  //     if (!Array.isArray(variants) || variants.length === 0) {
  //       throw new APIError("At least one variant is required", 400);
  //     }

  //     // HANDLE FILES

  //     const uploadedImages =
  //       req.files?.images?.map((f) => f.location) || [];

  //     const uploadedThumbnail =
  //       req.files?.thumbnail?.[0]?.location || null;

  //     if (uploadedImages.length) {
  //       productData.images = uploadedImages;
  //     }

  //     if (uploadedThumbnail) {
  //       productData.thumbnail = uploadedThumbnail;
  //     }

  //     // CREATE PRODUCT

  //     const productArr = await Product.create(
  //       [
  //         {
  //           ...productData,
  //           createdBy: req.user?.id,
  //         },
  //       ],
  //       { session }
  //     );

  //     const product = productArr[0];

  //     //  UPDATED — SECURITY CLEANUP
  //     const forbiddenFields = [
  //       "productId",
  //       "moduleId",
  //       "pcategoryId",
  //       "categoryId",
  //       "subcategoryId",
  //       "brandId",
  //     ];

  //     variants = variants.map((v) => {
  //       forbiddenFields.forEach((field) => delete v[field]);
  //       return v;
  //     });

  //     // PREPARE VARIANTS (AUTO INJECT)

  //     const preparedVariants = variants.map((variant) => ({
  //       ...variant,

  //       //  AUTO INJECT (IMPORTANT)
  //       productId: product._id,
  //       moduleId: product.moduleId,
  //       pcategoryId: product.pcategoryId,
  //       categoryId: product.categoryId,
  //       subcategoryId: product.subcategoryId,
  //       brandId: product.brandId,

  //       createdBy: req.user?.id,
  //     }));

  //     // BULK CREATE VARIANTS

  //     const createdVariants = await Variant.insertMany(preparedVariants, {
  //       session,
  //     });

  //     // SET DEFAULT VARIANT

  //     product.defaultVariantId = createdVariants[0]._id;
  //     await product.save({ session });

  //     await session.commitTransaction();
  //     session.endSession();

  //     //  UPDATED — BETTER CACHE CLEAR
  //     await RedisCache.deletePattern?.("products:*");
  //     await RedisCache.delete?.("products:");

  //     res.status(201).json({
  //       status: "success",
  //       message: "Product created with variants",
  //       data: {
  //         product,
  //         variants: createdVariants,
  //       },
  //     });
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     next(err);
  //   }
  // }

  static async createProduct(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      //  support normal form-data (CHANGED)
      let productData = { ...req.body };

      //  prevent client from spoofing vendor
      delete productData.vendorId;

      // parse shippingCharges from form-data
      if (typeof productData.shippingCharges === "string") {
        try {
          productData.shippingCharges = JSON.parse(productData.shippingCharges);
        } catch (err) {
          throw new APIError("Invalid shippingCharges format", 400);
        }
      }

      // optional but recommended normalization
      if (productData.shippingCharges) {
        productData.shippingCharges = {
          fixed: Number(productData.shippingCharges.fixed || 0),
          distancePerKm: Number(productData.shippingCharges.distancePerKm || 0),
          weightPerKg: Number(productData.shippingCharges.weightPerKg || 0),
        };
      }

      let variants = req.body.variants;

      //  remove variants from product payload (NEW)
      delete productData.variants;

      //  safer validation (UPDATED)
      if (!variants || !Array.isArray(variants) || variants.length === 0) {
        throw new APIError("At least one variant is required", 400);
      }

      // HANDLE FILES
      const uploadedImages = req.files?.images?.map((f) => f.location) || [];
      const uploadedThumbnail = req.files?.thumbnail?.[0]?.location || null;

      if (uploadedImages.length) {
        productData.images = uploadedImages;
      }

      if (uploadedThumbnail) {
        productData.thumbnail = uploadedThumbnail;
      }

      // ✅ CREATE PRODUCT (FIXED)
      const productArr = await Product.create(
        [
          {
            ...productData,
            vendorId: req.user.id,
            // ✅ correct owner
          },
        ],
        { session },
      );

      const product = productArr[0];

      // SECURITY CLEANUP
      const forbiddenFields = [
        "productId",
        "moduleId",
        "pcategoryId",
        "categoryId",
        "subcategoryId",
        "brandId",
      ];

      variants = variants.map((v) => {
        forbiddenFields.forEach((field) => delete v[field]);
        return v;
      });

      // PREPARE VARIANTS
      const preparedVariants = variants.map((variant) => {
        const mrp = Number(variant.mrp || 0);
        const discount = Number(variant.discount || 0);

        //  calculate both values
        const { price, discountAmount } = calculateDiscount(mrp, discount);

        //  prevent manual price override (PRO)
        const { price: _p, discountAmount: _d, ...safeVariant } = variant;

        return {
          ...safeVariant,

          price,
          discountAmount,

          // AUTO INJECT
          productId: product._id,
          moduleId: product.moduleId,
          pcategoryId: product.pcategoryId,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          brandId: product.brandId,

          // ✅ FIXED vendor ownership
          vendorId: req.user.id,
        };
      });

      // BULK CREATE VARIANTS
      const createdVariants = await Variant.insertMany(preparedVariants, {
        session,
      });

      // SET DEFAULT VARIANT
      product.defaultVariantId = createdVariants[0]._id;
      await product.save({ session });

      await session.commitTransaction();
      session.endSession();

      // CACHE CLEAR
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.delete?.("products:");

      res.status(201).json({
        status: "success",
        message: "Product created with variants",
        data: {
          product,
          variants: createdVariants,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  }
  // UPDATE PRODUCT

  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;

      let updateData = { ...req.body };

      // parse shippingCharges from form-data

      if (
        typeof updateData.shippingCharges === "string" &&
        updateData.shippingCharges.trim() !== ""
      ) {
        try {
          updateData.shippingCharges = JSON.parse(updateData.shippingCharges);
        } catch (err) {
          throw new APIError("Invalid shippingCharges format", 400);
        }
      }

      //  normalization (safe)
      if (
        updateData.shippingCharges &&
        typeof updateData.shippingCharges === "object"
      ) {
        updateData.shippingCharges = {
          fixed: Number(updateData.shippingCharges.fixed || 0),
          distancePerKm: Number(updateData.shippingCharges.distancePerKm || 0),
          weightPerKg: Number(updateData.shippingCharges.weightPerKg || 0),
        };
      }

      // HANDLE FILES
      const uploadedImages = req.files?.images?.map((f) => f.location) || [];

      const uploadedThumbnail = req.files?.thumbnail?.[0]?.location || null;

      if (uploadedImages.length) {
        updateData.images = uploadedImages;
      }

      if (uploadedThumbnail) {
        updateData.thumbnail = uploadedThumbnail;
      }

      const product = await Product.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedBy: req.user?.id,
        },
        { new: true },
      ).populate("brandId", "name");

      if (!product) {
        throw new APIError("Product not found", 404);
      }

      // clear cache properly
      await RedisCache.deletePattern?.("products:*");

      res.status(200).json({
        status: "success",
        message: "Product updated successfully",
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;

      const cacheKey = `product:v1:${id}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const product = await Product.findById(id)
        .populate("brandId", "name")
        .populate("defaultVariantId")
        .lean(); // faster

      if (!product) {
        throw new APIError("Product not found", 404);
      }

      const result = {
        status: "success",
        message: "Product fetched successfully",
        data: { product },
      };

      await RedisCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async disableProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { disable } = req.body;

      const product = await Product.findByIdAndUpdate(
        id,
        { disable: Boolean(disable) },
        { new: true },
      );

      if (!product) {
        throw new APIError("Product not found", 404);
      }

      //  smart cache clear
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.delete?.(`product:v1:${id}`);

      res.json({
        status: "success",
        message: `Product ${disable ? "disabled" : "enabled"} successfully`,
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { varified } = req.body;

      const product = await Product.findByIdAndUpdate(
        id,
        { varified: Boolean(varified) },
        { new: true },
      );

      if (!product) {
        throw new APIError("Product not found", 404);
      }

      //  smart cache clear
      await RedisCache.deletePattern?.("products:*");
      await RedisCache.delete?.(`product:v1:${id}`);

      res.json({
        status: "success",
        message: `Product ${varified ? "verified" : "unverified"} successfully`,
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProductVariants(req, res, next) {
    try {
      const { productId } = req.params;

      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limitRaw = parseInt(req.query.limit) || 10;
      const limit = Math.min(limitRaw, 50);
      const skip = (page - 1) * limit;

      const cacheKey = `product:v1:${productId}:variants:${page}:${limit}`;

      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const filter = { productId, disable: false };

      const [variants, total] = await Promise.all([
        Variant.find(filter, {
          price: 1,
          mrp: 1,
          discount: 1,
          discountAmount: 1,
          size: 1,
          stock: 1,
          Type: 1,
          sold: 1,
        })
          .sort({ price: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Variant.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      const result = {
        status: "success",
        message: "Product variants fetched successfully",
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
}

export default ProductController;
