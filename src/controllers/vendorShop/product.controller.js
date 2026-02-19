import mongoose from "mongoose";
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";


class ProductController {
  static async getProducts(req, res, next) {
    try {
      const cacheKey = `products:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const { page = 1, limit = 20, sort = "-createdAt" } = req.query;

      const query = { ...req.query };
      ["page", "limit", "sort"].forEach((f) => delete query[f]);

      const products = await Product.find(query)
        .populate("brandId", "name")
        .populate("defaultVariantId")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const result = {
        status: "success",
        message: "Products retrieved successfully",
        results: products.length,
        data: { products },
      };

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
    // ✅ support normal form-data (CHANGED)
    let productData = { ...req.body };
    let variants = req.body.variants;

    // ✅ remove variants from product payload (NEW)
    delete productData.variants;

    // ✅ safer validation (UPDATED)
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      throw new APIError("At least one variant is required", 400);
    }

    // HANDLE FILES (UNCHANGED)
    const uploadedImages =
      req.files?.images?.map((f) => f.location) || [];

    const uploadedThumbnail =
      req.files?.thumbnail?.[0]?.location || null;

    if (uploadedImages.length) {
      productData.images = uploadedImages;
    }

    if (uploadedThumbnail) {
      productData.thumbnail = uploadedThumbnail;
    }

    // CREATE PRODUCT (UNCHANGED)
    const productArr = await Product.create(
      [
        {
          ...productData,
          createdBy: req.user?.id,
        },
      ],
      { session }
    );

    const product = productArr[0];

    // SECURITY CLEANUP (UNCHANGED)
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

    // PREPARE VARIANTS (UNCHANGED)
    const preparedVariants = variants.map((variant) => ({
      ...variant,

      // AUTO INJECT
      productId: product._id,
      moduleId: product.moduleId,
      pcategoryId: product.pcategoryId,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      brandId: product.brandId,

      createdBy: req.user?.id,
    }));

    // BULK CREATE VARIANTS (UNCHANGED)
    const createdVariants = await Variant.insertMany(preparedVariants, {
      session,
    });

    // SET DEFAULT VARIANT (UNCHANGED)
    product.defaultVariantId = createdVariants[0]._id;
    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    // CACHE CLEAR (UNCHANGED)
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

      const product = await Product.findByIdAndUpdate(
        id,
        {
          ...req.body,
          updatedBy: req.user?.id,
        },
        { new: true },
      ).populate("brandId", "name");

      if (!product) {
        throw new APIError("Product not found", 404);
      }

      // clear cache properly
      await RedisCache.delete("products:");

      res.status(200).json({
        status: "success",
        message: "Product updated successfully",
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default ProductController;
