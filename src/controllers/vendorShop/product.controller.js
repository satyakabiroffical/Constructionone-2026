import mongoose from "mongoose"; //Sanvi
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Brand from "../../models/vendorShop/brand.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import { calculateDiscount } from "../../utils/priceCalculator.js";

import {
  VendorCompany,
  VendorProfile,
} from "../../models/vendorShop/vendor.model.js";

import { sendAdminNotification } from "../../services/adminNotification.service.js";
import { createActivityLog } from "../admin/activityLog.controller.js";

class ProductController {
  //admingetAll
  static async getAllProductsAdmin(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sort,
        minPrice,
        maxPrice,
        moduleId,
        pcategoryId,
        categoryId,
        subcategoryId,
        brandId,
        varified, // optional filter (true/false/all)
        search,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const cacheKey = `products:admin:v1:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      // ================= BASE MATCH =================
      const matchStage = {
        status: { $ne: "DRAFT" },
      };

      if (varified === "true") matchStage.varified = true;
      if (varified === "false") matchStage.varified = false;

      if (req.query.disable === "true") matchStage.disable = true;
      if (req.query.disable === "false") matchStage.disable = false;

      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { "metaData.title": { $regex: search, $options: "i" } },
          { "brandId.name": { $regex: search, $options: "i" } }, // after lookup
        ];
      }

      // ================= CATEGORY FILTER =================
      const toObjectId = (id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null;

      if (moduleId) matchStage.moduleId = toObjectId(moduleId);
      if (pcategoryId) matchStage.pcategoryId = toObjectId(pcategoryId);
      if (categoryId) matchStage.categoryId = toObjectId(categoryId);
      if (subcategoryId) matchStage.subcategoryId = toObjectId(subcategoryId);
      if (brandId) matchStage.brandId = toObjectId(brandId);

      const pipeline = [];

      pipeline.push({ $match: matchStage });

      pipeline.push({
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...(minPrice || maxPrice
                  ? {
                      price: {
                        ...(minPrice && { $gte: Number(minPrice) }),
                        ...(maxPrice && { $lte: Number(maxPrice) }),
                      },
                    }
                  : {}),
              },
            },
            { $sort: { price: 1 } },
            { $limit: 1 },
          ],
          as: "defaultVariant",
        },
      });

      pipeline.push(
        {
          $lookup: {
            from: "vendorcompanies",
            localField: "vendorId",
            foreignField: "vendorId",
            as: "vendorCompany",
          },
        },
        {
          $unwind: {
            path: "$vendorCompany",
            preserveNullAndEmptyArrays: true,
          },
        },
      );

      pipeline.push({
        $sort:
          sort === "priceLowHigh"
            ? { "defaultVariant.price": 1 }
            : sort === "priceHighLow"
              ? { "defaultVariant.price": -1 }
              : { createdAt: -1 },
      });
      // ================= BRAND LOOKUP =================
      pipeline.push(
        {
          $lookup: {
            from: "brands",
            localField: "brandId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1 } }],
            as: "brandId",
          },
        },
        { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
      );
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });

      const products = await Product.aggregate(pipeline);

      const response = {
        success: true,
        message: "Admin products fetched successfully",
        results: products.length,
        data: { products },
      };

      await RedisCache.set(cacheKey, response, 60);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
  //users get all
  static async getProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sort,
        minPrice,
        maxPrice,
        lat,
        lng,
        radius = 50000,
        type,
        newArrival,
        moduleId,
        pcategoryId,
        categoryId,
        subcategoryId,
        brandId,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      // REDIS CACHE
      const cacheKey = `products:public:v2:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const useGeo = lat && lng && sort === "nearest";
      // ================= BASE MATCH =================
      const matchStage = {
        disable: false,
        varified: true,
        status: "ACTIVE",
      };

      // ================= CATEGORY FILTERS =================
      const toObjectId = (id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null;

      if (moduleId) matchStage.moduleId = toObjectId(moduleId);
      if (pcategoryId) matchStage.pcategoryId = toObjectId(pcategoryId);
      if (categoryId) matchStage.categoryId = toObjectId(categoryId);
      if (subcategoryId) matchStage.subcategoryId = toObjectId(subcategoryId);
      if (brandId) matchStage.brandId = toObjectId(brandId);

      if (newArrival === "true") {
        matchStage.createdAt = {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        };
      }

      // ================= PIPELINE =================
      const pipeline = [];

      //  GEO FIRST (kept as you wrote) - sanvi
      if (useGeo) {
        pipeline.push({
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)],
            },
            distanceField: "distance",
            maxDistance: Number(radius),
            spherical: true,
            key: "vendorCompany.location",
          },
        });
      }

      // early product filter
      pipeline.push({ $match: matchStage });

      // ================= VARIANT LOOKUP =================
      pipeline.push({
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                disable: false,
                ...(type && { Type: type }),
                ...((minPrice || maxPrice) && {
                  price: {
                    ...(minPrice && { $gte: Number(minPrice) }),
                    ...(maxPrice && { $lte: Number(maxPrice) }),
                  },
                }),
              },
            },
            { $sort: { price: 1 } },
            { $limit: 1 },
            {
              $project: {
                price: 1,
                Type: 1,
                mrp: 1,
                discount: 1,
                packageDimensions: 1,
                packageWeight: 1,
              },
            },
          ],
          as: "defaultVariant",
        },
      });

      // remove products without valid variant
      pipeline.push({
        $match: {
          defaultVariant: { $ne: [] },
        },
      });

      // ================= FIXED VENDOR LOOKUP =================
      // pipeline.push(
      //   {
      //     $lookup: {
      //       from: "vendorcompanies",
      //       localField: "vendorId",
      //       foreignField: "vendorId",
      //       as: "vendorCompany",
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: "$vendorCompany",
      //       preserveNullAndEmptyArrays: true, // IMPORTANT FIX
      //     },
      //   },
      // );

      pipeline.push(
        // ================= VENDOR COMPANY =================
        {
          $lookup: {
            from: "vendorcompanies",
            localField: "vendorId",
            foreignField: "vendorId",
            as: "vendorCompany",
          },
        },
        {
          $unwind: {
            path: "$vendorCompany",
            preserveNullAndEmptyArrays: true,
          },
        },

        // ================= VENDOR PROFILE =================
        {
          $lookup: {
            from: "vendorprofiles",
            localField: "vendorCompany.vendorId",
            foreignField: "_id",
            as: "vendorProfile",
          },
        },
        {
          $unwind: {
            path: "$vendorProfile",
            preserveNullAndEmptyArrays: true,
          },
        },

        // ================= FINAL CLEAN RESPONSE =================
        {
          // $addFields: {
          //   vendor: {
          //     companyName: "$vendorCompany.companyName",
          //     businessAddress: "$vendorCompany.businessAddress",
          //     badges: "$vendorCompany.badges",
          //     // shopImages: "$vendorCompany.shopImages",
          //     firstName: "$vendorProfile.firstName",
          //     lastName: "$vendorProfile.lastName",
          //   },
          //   vendorLocation: "$vendorLocation",
          // },

          $addFields: {
            vendor: {
              companyName: "$vendorCompany.companyName",
              businessAddress: "$vendorCompany.businessAddress",
              badges: "$vendorCompany.badges",
              firstName: "$vendorProfile.firstName",
              lastName: "$vendorProfile.lastName",
            },
            vendorLocation: "$vendorLocation",
          },
        },

        // ================= REMOVE EXTRA FIELDS =================
        {
          $project: {
            vendorCompany: 0,
            vendorProfile: 0,
          },
        },
      );

      // ================= SORT =================
      pipeline.push({
        $sort:
          sort === "priceLowHigh"
            ? { "defaultVariant.price": 1 }
            : sort === "priceHighLow"
              ? { "defaultVariant.price": -1 }
              : sort === "nearest" && useGeo
                ? { distance: 1 }
                : sort === "newest"
                  ? { createdAt: -1 }
                  : { createdAt: -1 },
      });

      // ================= PAGINATION =================
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });

      // ================= BRAND LOOKUP =================
      pipeline.push(
        {
          $lookup: {
            from: "brands",
            localField: "brandId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1 } }],
            as: "brandId",
          },
        },
        { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },
      );

      const products = await Product.aggregate(pipeline);

      const response = {
        success: true,
        message: "Products fetched successfully",
        results: products.length,
        data: { products },
      };

      // CACHE RESULT
      // await RedisCache.set(cacheKey, response, 60);
      return res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getVendorProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sort,
        minPrice,
        maxPrice,
        type,
        newArrival,
        moduleId,
        pcategoryId,
        categoryId,
        subcategoryId,
        brandId,
        search,
      } = req.query;

      const { vendorId } = req.params;

      // ✅ Validate vendor
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // ✅ Validate type (MANDATORY)
      if (!type || !["BULK", "RETAIL"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be BULK or RETAIL",
        });
      }

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // ✅ Cache key
      const cacheKey = `products:vendor:${vendorId}:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      // ================= BASE MATCH =================
      const matchStage = {
        disable: false,
        vendorId: new mongoose.Types.ObjectId(vendorId),
      };

      // ✅ Search
      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // ✅ ObjectId helper
      const toObjectId = (id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null;

      if (moduleId) matchStage.moduleId = toObjectId(moduleId);
      if (pcategoryId) matchStage.pcategoryId = toObjectId(pcategoryId);
      if (categoryId) matchStage.categoryId = toObjectId(categoryId);
      if (subcategoryId) matchStage.subcategoryId = toObjectId(subcategoryId);
      if (brandId) matchStage.brandId = toObjectId(brandId);

      // ✅ New arrival (last 7 days)
      if (newArrival === "true") {
        matchStage.createdAt = {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        };
      }

      // ================= PIPELINE =================
      const pipeline = [];

      pipeline.push({ $match: matchStage });

      // ================= VARIANT LOOKUP =================
      pipeline.push({
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                disable: false,

                // ✅ STRICT TYPE FILTER
                Type: type,

                // ✅ REMOVE INVALID PRICE
                price: { $gt: 0 },

                ...((minPrice || maxPrice) && {
                  price: {
                    ...(minPrice && { $gte: Number(minPrice) }),
                    ...(maxPrice && { $lte: Number(maxPrice) }),
                  },
                }),
              },
            },
            { $sort: { price: 1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                price: 1,
                mrp: 1,
                discount: 1,
                Type: 1,
              },
            },
          ],
          as: "defaultVariant",
        },
      });

      // ✅ Convert array → object
      pipeline.push({
        $addFields: {
          defaultVariant: { $arrayElemAt: ["$defaultVariant", 0] },
        },
      });

      // ✅ Remove products without valid variant
      pipeline.push({
        $match: {
          defaultVariant: { $ne: null },
        },
      });

      // ================= SORT =================
      pipeline.push({
        $sort:
          sort === "priceLowHigh"
            ? { "defaultVariant.price": 1 }
            : sort === "priceHighLow"
              ? { "defaultVariant.price": -1 }
              : sort === "oldest"
                ? { createdAt: 1 }
                : { createdAt: -1 },
      });

      // ================= FACET (Pagination + Count) =================
      pipeline.push({
        $facet: {
          products: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      });

      // ================= BRAND LOOKUP =================
      pipeline.push({
        $addFields: {
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
        },
      });

      pipeline.push({
        $unwind: "$products",
      });

      pipeline.push({
        $lookup: {
          from: "brands",
          localField: "products.brandId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "products.brandId",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$products.brandId",
          preserveNullAndEmptyArrays: true,
        },
      });

      pipeline.push({
        $group: {
          _id: null,
          products: { $push: "$products" },
          totalCount: { $first: "$totalCount" },
        },
      });

      // ================= EXECUTE =================
      const result = await Product.aggregate(pipeline);

      const products = result[0]?.products || [];
      const total = result[0]?.totalCount || 0;

      const response = {
        success: true,
        message: "Vendor products fetched successfully",
        results: products.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: { products },
      };

      // ✅ Cache (60 sec)
      await RedisCache.set(cacheKey, response, 60);

      return res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
  static async getProductsByVendorId(req, res, next) {
    try {
      const { vendorId } = req.params;
      const { search = "", page = 1, limit = 20 } = req.query;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "vendorId is required",
        });
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(parseInt(limit) || 20, 50);
      const skip = (pageNum - 1) * limitNum;

      const cacheKey = `admin:vendor:products:${vendorId}:${search}:${pageNum}:${limitNum}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(cached);

      const matchStage = {
        vendorId: new mongoose.Types.ObjectId(vendorId),
      };

      if (search) {
        matchStage.name = { $regex: search, $options: "i" };
      }

      const pipeline = [
        { $match: matchStage },

        {
          $project: {
            _id: 1,
            name: 1,
            vendorId: 1,
          },
        },

        {
          $facet: {
            products: [{ $skip: skip }, { $limit: limitNum }],
            totalCount: [{ $count: "count" }],
          },
        },

        {
          $addFields: {
            total: { $arrayElemAt: ["$totalCount.count", 0] },
          },
        },
      ];

      const result = await Product.aggregate(pipeline);

      const products = result[0]?.products || [];
      const total = result[0]?.total || 0;

      const response = {
        success: true,
        message: "Vendor products fetched successfully",
        results: products.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: { products },
      };

      await RedisCache.set(cacheKey, response, 30);

      return res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  //asgar-code
  // static async createProduct(req, res, next) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     // =========================
  //     // BASIC PRODUCT DATA
  //     // =========================
  //     let productData = { ...req.body };

  //     // prevent client from spoofing vendor
  //     delete productData.vendorId;

  //     // =========================
  //     // MULTIPLE SUBCATEGORY SUPPORT
  //     // =========================

  //     // subcategoryId => array support
  //     if (typeof productData.subcategoryId === "string") {
  //       try {
  //         productData.subcategoryId = JSON.parse(productData.subcategoryId);

  //         if (!Array.isArray(productData.subcategoryId)) {
  //           productData.subcategoryId = [productData.subcategoryId];
  //         }
  //       } catch (err) {
  //         productData.subcategoryId = [productData.subcategoryId];
  //       }
  //     }

  //     if (
  //       !productData.subcategoryId ||
  //       !Array.isArray(productData.subcategoryId) ||
  //       productData.subcategoryId.length === 0
  //     ) {
  //       throw new APIError("At least one subcategory is required", 400);
  //     }

  //     // =========================
  //     // MULTIPLE PRODUCT TYPE SUPPORT
  //     // =========================

  //     // productTypeId => array support
  //     if (typeof productData.productTypeId === "string") {
  //       try {
  //         productData.productTypeId = JSON.parse(productData.productTypeId);

  //         if (!Array.isArray(productData.productTypeId)) {
  //           productData.productTypeId = [productData.productTypeId];
  //         }
  //       } catch (err) {
  //         productData.productTypeId = [productData.productTypeId];
  //       }
  //     }

  //     if (
  //       !productData.productTypeId ||
  //       !Array.isArray(productData.productTypeId) ||
  //       productData.productTypeId.length === 0
  //     ) {
  //       throw new APIError("At least one product type is required", 400);
  //     }

  //     // =========================
  //     // SHIPPING CHARGES PARSE
  //     // =========================

  //     if (typeof productData.shippingCharges === "string") {
  //       try {
  //         productData.shippingCharges = JSON.parse(productData.shippingCharges);
  //       } catch (err) {
  //         throw new APIError("Invalid shippingCharges format", 400);
  //       }
  //     }

  //     if (productData.shippingCharges) {
  //       productData.shippingCharges = {
  //         fixed: Number(productData.shippingCharges.fixed || 0),
  //         distancePerKm: Number(productData.shippingCharges.distancePerKm || 0),
  //         weightPerKg: Number(productData.shippingCharges.weightPerKg || 0),
  //       };
  //     }

  //     // =========================
  //     // VARIANTS
  //     // =========================

  //     let variants = req.body.variants;

  //     // remove from product payload
  //     delete productData.variants;

  //     // if variants sent as string (form-data)
  //     if (typeof variants === "string") {
  //       try {
  //         variants = JSON.parse(variants);
  //       } catch (err) {
  //         throw new APIError("Invalid variants format", 400);
  //       }
  //     }

  //     if (!variants || !Array.isArray(variants) || variants.length === 0) {
  //       throw new APIError("At least one variant is required", 400);
  //     }

  //     // =========================
  //     // HANDLE FILES
  //     // =========================

  //     const uploadedImages =
  //       req.files?.images?.map((file) => file.location) || [];

  //     const uploadedThumbnail = req.files?.thumbnail?.[0]?.location || null;

  //     if (uploadedImages.length) {
  //       productData.images = uploadedImages;
  //     }

  //     if (uploadedThumbnail) {
  //       productData.thumbnail = uploadedThumbnail;
  //     }

  //     // =========================
  //     // VENDOR LOCATION
  //     // =========================

  //     const vendorCompany = await VendorCompany.findOne({
  //       vendorId: req.user.id,
  //     })
  //       .select("location companyName")
  //       .lean();

  //     let vendorLocation = undefined;

  //     if (vendorCompany?.location?.coordinates?.length === 2) {
  //       vendorLocation = vendorCompany.location;
  //     }

  //     // =========================
  //     // CREATE PRODUCT
  //     // =========================

  //     const productArr = await Product.create(
  //       [
  //         {
  //           ...productData,
  //           vendorId: req.user.id,
  //           vendorLocation,
  //         },
  //       ],
  //       { session },
  //     );

  //     const product = productArr[0];

  //     // =========================
  //     // SECURITY CLEANUP
  //     // =========================

  //     const forbiddenFields = [
  //       "productId",
  //       "moduleId",
  //       "pcategoryId",
  //       "categoryId",
  //       "subcategoryId",
  //       "productTypeId",
  //       "brandId",
  //       "vendorId",
  //       "price",
  //       "discountAmount",
  //     ];

  //     variants = variants.map((variant) => {
  //       forbiddenFields.forEach((field) => delete variant[field]);
  //       return variant;
  //     });

  //     // =========================
  //     // PREPARE VARIANTS
  //     // =========================

  //     const preparedVariants = variants.map((variant) => {
  //       const mrp = Number(variant.mrp || 0);
  //       const discount = Number(variant.discount || 0);

  //       const { price, discountAmount } = calculateDiscount(mrp, discount);

  //       const {
  //         price: removedPrice,
  //         discountAmount: removedDiscountAmount,
  //         ...safeVariant
  //       } = variant;

  //       return {
  //         ...safeVariant,

  //         // auto calculated values
  //         price,
  //         discountAmount,

  //         // auto inject relations
  //         productId: product._id,
  //         moduleId: product.moduleId,
  //         pcategoryId: product.pcategoryId,
  //         categoryId: product.categoryId,

  //         // multiple array fields
  //         subcategoryId: product.subcategoryId,
  //         productTypeId: product.productTypeId,

  //         brandId: product.brandId,
  //         vendorId: req.user.id,
  //       };
  //     });

  //     // =========================
  //     // BULK CREATE VARIANTS
  //     // =========================

  //     const createdVariants = await Variant.insertMany(preparedVariants, {
  //       session,
  //     });

  //     // =========================
  //     // DEFAULT VARIANT
  //     // =========================

  //     product.defaultVariantId = createdVariants[0]._id;
  //     await product.save({ session });

  //     // =========================
  //     // COMMIT TRANSACTION
  //     // =========================

  //     await session.commitTransaction();
  //     session.endSession();

  //     // =========================
  //     // CACHE CLEAR
  //     // =========================

  //     await Promise.all([
  //       RedisCache.deletePattern("products:public:v2:*"),
  //       RedisCache.deletePattern("products:admin:v1:*"),
  //       RedisCache.deletePattern("products:vendor:*"),
  //       RedisCache.deletePattern("products:subcat:*"),
  //       RedisCache.deletePattern("products:cat:*"),
  //       RedisCache.deletePattern("products:*"),
  //       RedisCache.deletePattern(`vendor:${req.user.id}:products:*`),
  //     ]);

  //     await sendAdminNotification({
  //       title: "New Product Added",
  //       message: `${vendorCompany?.companyName} added new product ${product.name}`,
  //       type: "PRODUCT_CREATED",
  //       userId: req.user.id,
  //       color: "blue",
  //       redirectUrl: `/marketplace/products`,
  //     });
  //     // =========================
  //     // RESPONSE
  //     // =========================

  //     res.status(201).json({
  //       status: "success",
  //       message: "Product created successfully with variants",
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
      // =========================
      // BASIC PRODUCT DATA
      // =========================
      let productData = { ...req.body };

      // prevent client from spoofing vendor
      delete productData.vendorId;

      // =========================
      // IMAGE VALIDATION
      // =========================

      const uploadedImages =
        req.files?.images?.map((file) => file.location) || [];

      const uploadedThumbnail = req.files?.thumbnail?.[0]?.location || null;

      // if (!uploadedThumbnail) {
      //   throw new APIError(
      //     "Product thumbnail is required. Please upload at least one thumbnail image.",
      //     400,
      //   );
      // }

      if (!uploadedImages || uploadedImages.length === 0) {
        throw new APIError(
          400,
          "Product images are required. Please upload at least one product image.",
        );
      }

      // =========================
      // MULTIPLE SUBCATEGORY SUPPORT
      // =========================

      if (typeof productData.subcategoryId === "string") {
        try {
          productData.subcategoryId = JSON.parse(productData.subcategoryId);

          if (!Array.isArray(productData.subcategoryId)) {
            productData.subcategoryId = [productData.subcategoryId];
          }
        } catch (err) {
          productData.subcategoryId = [productData.subcategoryId];
        }
      }

      if (
        !productData.subcategoryId ||
        !Array.isArray(productData.subcategoryId) ||
        productData.subcategoryId.length === 0
      ) {
        throw new APIError(400, "At least one subcategory is required");
      }

      // =========================
      // MULTIPLE PRODUCT TYPE SUPPORT
      // =========================

      if (typeof productData.productTypeId === "string") {
        try {
          productData.productTypeId = JSON.parse(productData.productTypeId);

          if (!Array.isArray(productData.productTypeId)) {
            productData.productTypeId = [productData.productTypeId];
          }
        } catch (err) {
          productData.productTypeId = [productData.productTypeId];
        }
      }

      if (
        !productData.productTypeId ||
        !Array.isArray(productData.productTypeId) ||
        productData.productTypeId.length === 0
      ) {
        throw new APIError(400, "At least one product type is required");
      }

      // =========================
      // DUPLICATE PRODUCT CHECK
      // =========================

      const duplicateProduct = await Product.findOne({
        vendorId: req.user.id,
        $or: [
          {
            name: {
              $regex: `^${productData.name}$`,
              $options: "i",
            },
          },
          {
            slug: {
              $regex: `^${productData.slug}$`,
              $options: "i",
            },
          },
        ],
      })
        .select("name slug")
        .lean();

      if (duplicateProduct) {
        throw new APIError(
          409,
          `You already created this product. Existing product: "${duplicateProduct.name}"`,
        );
      }

      // =========================
      // SHIPPING CHARGES PARSE
      // =========================

      // =========================
      // SHIPPING CHARGES PARSE
      // =========================

      if (typeof productData.shippingCharges === "string") {
        try {
          productData.shippingCharges = JSON.parse(productData.shippingCharges);
        } catch (err) {
          throw new APIError(400, "Invalid shippingCharges format");
        }
      }

      if (!productData.shippingCharges) {
        throw new APIError(400, "Shipping charges are required");
      }

      const shipping = productData.shippingCharges;

      // =========================
      // REQUIRED FIELDS
      // =========================

      if (
        shipping.fixed === undefined ||
        shipping.fixed === null ||
        shipping.fixed === ""
      ) {
        throw new APIError(400, "Fixed shipping charge is required");
      }

      if (
        shipping.distancePerKm === undefined ||
        shipping.distancePerKm === null ||
        shipping.distancePerKm === ""
      ) {
        throw new APIError(400, "Distance per KM shipping charge is required");
      }

      // =========================
      // CONVERT TO NUMBER
      // =========================

      productData.shippingCharges = {
        fixed: Number(shipping.fixed || 0),
        distancePerKm: Number(shipping.distancePerKm || 0),

        weightPerKg: Number(shipping.weightPerKg || 0),
        perPieceCharge: Number(shipping.perPieceCharge || 0),
        perLiterCharge: Number(shipping.perLiterCharge || 0),
        perMeterCharge: Number(shipping.perMeterCharge || 0),
        perBoxCharge: Number(shipping.perBoxCharge || 0),
        perSuperMeterCharge: Number(shipping.perSuperMeterCharge || 0),
        perCubicMeterCharge: Number(shipping.perCubicMeterCharge || 0),
        perSetCharge: Number(shipping.perSetCharge || 0),
        perRollCharge: Number(shipping.perRollCharge || 0),
      };

      // =========================
      // AT LEAST ONE EXTRA CHARGE
      // =========================

      const extraChargeFields = [
        "weightPerKg",
        "perPieceCharge",
        "perLiterCharge",
        "perMeterCharge",
        "perBoxCharge",
        "perSuperMeterCharge",
        "perCubicMeterCharge",
        "perSetCharge",
        "perRollCharge",
      ];

      const hasAnyExtraCharge = extraChargeFields.some(
        (field) => Number(productData.shippingCharges[field]) > 0,
      );

      if (!hasAnyExtraCharge) {
        throw new APIError(
          400,
          "Please provide at least one additional shipping charge type (Weight, Piece, Liter, Meter, Box, Set, Roll, etc.)",
        );
      }
      // =========================
      // VARIANTS
      // =========================

      let variants = req.body.variants;

      delete productData.variants;

      if (typeof req.body.variants === "string") {
        try {
          req.body.variants = JSON.parse(req.body.variants);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Invalid variants JSON format",
          });
        }
      }

      if (!Array.isArray(req.body.variants) || req.body.variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one variant is required and must be an array",
        });
      }

      // =========================
      // HANDLE FILES
      // =========================

      productData.images = uploadedImages;
      productData.thumbnail = uploadedThumbnail;

      // =========================
      // VENDOR LOCATION
      // =========================

      const vendorCompany = await VendorCompany.findOne({
        vendorId: req.user.id,
      })
        .select("location companyName")
        .lean();

      let vendorLocation = undefined;

      if (vendorCompany?.location?.coordinates?.length === 2) {
        vendorLocation = vendorCompany.location;
      }

      // =========================
      // CREATE PRODUCT
      // =========================

      const productArr = await Product.create(
        [
          {
            ...productData,
            vendorId: req.user.id,
            vendorLocation,
          },
        ],
        { session },
      );

      const product = productArr[0];

      // =========================
      // SECURITY CLEANUP
      // =========================

      const forbiddenFields = [
        "productId",
        "moduleId",
        "pcategoryId",
        "categoryId",
        "subcategoryId",
        "productTypeId",
        "brandId",
        "vendorId",
        "price",
        "discountAmount",
      ];

      variants = variants.map((variant) => {
        forbiddenFields.forEach((field) => delete variant[field]);
        return variant;
      });

      // =========================
      // PREPARE VARIANTS
      // =========================

      const preparedVariants = variants.map((variant) => {
        const mrp = Number(variant.mrp || 0);
        const discount = Number(variant.discount || 0);

        const { price, discountAmount } = calculateDiscount(mrp, discount);

        const {
          price: removedPrice,
          discountAmount: removedDiscountAmount,
          ...safeVariant
        } = variant;

        return {
          ...safeVariant,

          price,
          discountAmount,

          productId: product._id,
          moduleId: product.moduleId,
          pcategoryId: product.pcategoryId,
          categoryId: product.categoryId,

          subcategoryId: product.subcategoryId,
          productTypeId: product.productTypeId,

          brandId: product.brandId,
          vendorId: req.user.id,
        };
      });

      // =========================
      // BULK CREATE VARIANTS
      // =========================

      const createdVariants = await Variant.insertMany(preparedVariants, {
        session,
      });

      // =========================
      // DEFAULT VARIANT
      // =========================

      product.defaultVariantId = createdVariants[0]._id;
      await product.save({ session });

      // =========================
      // COMMIT TRANSACTION
      // =========================

      await session.commitTransaction();
      session.endSession();

      // =========================
      // CACHE CLEAR
      // =========================

      await Promise.all([
        RedisCache.deletePattern("products:public:v2:*"),
        RedisCache.deletePattern("products:admin:v1:*"),
        RedisCache.deletePattern("products:vendor:*"),
        RedisCache.deletePattern("products:subcat:*"),
        RedisCache.deletePattern("products:cat:*"),
        RedisCache.deletePattern("products:*"),
        RedisCache.deletePattern(`vendor:${req.user.id}:products:*`),
      ]);

      // =========================
      // ADMIN NOTIFICATION
      // =========================

      await sendAdminNotification({
        title: "New Product Added",
        message: `${vendorCompany?.companyName} added new product ${product.name}`,
        type: "PRODUCT_CREATED",
        userId: req.user.id,
        color: "blue",
        redirectUrl: `/marketplace/products`,
      });

      // =========================
      // RESPONSE
      // =========================

      res.status(201).json({
        status: "success",
        message: "Product created successfully with variants",
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
          throw new APIError(400, "Invalid shippingCharges format");
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
        throw new APIError(404, "Product not found");
      }

      // clear cache properly
      await Promise.all([
        RedisCache.deletePattern("products:public:v2:*"),
        RedisCache.deletePattern("products:admin:v1:*"),
        RedisCache.deletePattern("products:vendor:*"),
        RedisCache.deletePattern("products:subcat:*"),
        RedisCache.deletePattern("products:*"), // optional full clear
        RedisCache.delete(`product:v1:${id}`),
        RedisCache.deletePattern(`products:cat:*`),
      ]);
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
      const { type } = req.query;

      // ======================================================
      // CACHE
      // ======================================================

      const cacheKey = `product:v4:${id}:${type || "ALL"}`;
      const cached = await RedisCache.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      // ======================================================
      // PRODUCT
      // ======================================================

      const product = await Product.findById(id)
        .populate("brandId", "name logo")
        .populate("subcategoryId", "name")
        .populate("productTypeId", "typeName")
        .lean();

      if (!product) {
        throw new APIError(404, "Product not found");
      }

      // ======================================================
      // VENDOR COMPANY
      // ======================================================

      const vendorCompanyData = await VendorCompany.findOne({
        vendorId: product.vendorId,
      })
        .populate("vendorId", "firstName lastName email mobile profileImage")
        .lean();

      // ======================================================
      // VARIANT FILTER
      // ======================================================

      const variantFilter = {
        productId: id,
        disable: false,
      };

      if (type) {
        variantFilter.Type = type.toUpperCase();
      }

      // ======================================================
      // VARIANTS
      // ======================================================

      const variants = await Variant.find(variantFilter)
        .sort({ createdAt: -1 })
        .lean();

      // ======================================================
      // CLEAN VARIANTS
      // ======================================================

      const cleanVariants = variants.map((variant) => ({
        id: variant._id,

        type: variant.Type,

        size: variant.size,
        outOfStock: variant.stock === 0, // ADD THIS
        pricing: {
          price: variant.price,
          mrp: variant.mrp,
          discount: variant.discount,
          discountAmount: variant.discountAmount,
        },

        stock: {
          availableStock: variant.stock,
          sold: variant.sold,
        },

        moq: variant.moq,

        package: {
          weight: variant.packageWeight,
          dimensions: variant.packageDimensions,
        },
      }));

      // ======================================================
      // CLEAN PRODUCT
      // ======================================================

      const cleanProduct = {
        id: product._id,

        name: product.name,

        slug: product.slug,

        description: product.description,

        features: product.features,

        specification: product.specification,

        safetyInstructions: product.safetyInstructions,

        images: product.images,

        measurementUnit: product.measurementUnit,

        leadTime: product.leadTime,

        warrantyPeriod: product.warrantyPeriod,

        returnDays: product.returnDays,

        deliveryCharges: product.deliveryCharges,

        deliveryOptions: product.deliveryOptions,

        serviceableDeliveryPincode: product.serviceableDeliveryPincode,

        shippingCharges: {
          fixed: product.shippingCharges?.fixed,
          distancePerKm: product.shippingCharges?.distancePerKm,
          weightPerKg: product.shippingCharges?.weightPerKg,
        },

        rating: {
          average: product.avgRating,
          totalReviews: product.reviewCount,
        },

        sales: {
          sold: product.sold,
        },

        offer: {
          discount: product.discount,
          isFeatured: product.isFeatured,
          isFlashSale: product.isFlashSale,
        },

        brand: {
          id: product.brandId?._id,
          name: product.brandId?.name,
          logo: product.brandId?.logo,
        },

        subcategories:
          product.subcategoryId?.map((item) => ({
            id: item._id,
            name: item.name,
          })) || [],

        productTypes:
          product.productTypeId?.map((item) => ({
            id: item._id,
            name: item.typeName,
          })) || [],

        metadata: {
          title: product.metaData?.title,
          description: product.metaData?.description,
          keywords: product.metaData?.keywords,
        },

        properties: product.properties?.map((item) => ({
          key: item.key,
          value: item.value,
        })),

        verification: {
          verified: product.varified,
          reason: product.verifyReason,
        },

        status: product.status,

        defaultVariantId: product.defaultVariantId,

        vendor: {
          id: vendorCompanyData?.vendorId?._id,

          firstName: vendorCompanyData?.vendorId?.firstName,

          lastName: vendorCompanyData?.vendorId?.lastName,

          email: vendorCompanyData?.vendorId?.email,

          mobile: vendorCompanyData?.vendorId?.mobile,

          profileImage: vendorCompanyData?.vendorId?.profileImage,

          shopName: vendorCompanyData?.companyName,

          certificates: vendorCompanyData?.certificates || [],
        },
      };

      // ======================================================
      // RESPONSE
      // ======================================================

      const result = {
        status: "success",
        message: "Product fetched successfully",
        data: {
          product: cleanProduct,
          variants: cleanVariants,
        },
      };

      // ======================================================
      // CACHE SAVE
      // ======================================================

      await RedisCache.set(cacheKey, result);

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getProductsBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const { page = 1, limit = 10, minRating = 2 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // ======================================================
      // CACHE
      // ======================================================

      const cacheKey = `products-by-slug:${slug}:page:${page}:limit:${limit}:minRating:${minRating}`;

      const cached = await RedisCache.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      // ======================================================
      // FIND MAIN PRODUCT
      // ======================================================

      const mainProduct = await Product.findOne({
        slug,
      })
        .select("slug")
        .lean();

      if (!mainProduct) {
        throw new APIError(404, "Product not found");
      }

      // ======================================================
      // GET PRODUCTS
      // ======================================================

      let products = await Product.find({
        slug: mainProduct.slug,
        status: "ACTIVE",
        avgRating: { $gte: Number(minRating) },
      })
        .select(
          `
        _id
        name
        slug
        vendorId
        leadTime
        images
        defaultVariantId
        avgRating
        reviewCount
      `,
        )
        .lean();

      // ======================================================
      // FALLBACK IF NO HIGH RATED PRODUCT
      // ======================================================

      if (products.length === 0) {
        products = await Product.find({
          slug: mainProduct.slug,
          status: "ACTIVE",
        })
          .select(
            `
          _id
          name
          slug
          vendorId
          leadTime
          images
          defaultVariantId
          avgRating
          reviewCount
        `,
          )
          .lean();
      }

      // ======================================================
      // PAGINATION
      // ======================================================

      const total = products.length;

      const paginatedProducts = products.slice(skip, skip + Number(limit));

      // ======================================================
      // IDS
      // ======================================================

      const productIds = paginatedProducts.map((p) => p._id);

      const vendorIds = paginatedProducts.map((p) => p.vendorId);

      // ======================================================
      // VARIANTS
      // ======================================================

      const variants = await Variant.find({
        productId: { $in: productIds },
        disable: false,
      }).lean();

      // ======================================================
      // VENDOR COMPANIES
      // ======================================================

      const vendorCompanies = await VendorCompany.find({
        vendorId: { $in: vendorIds },
      })
        .select("vendorId companyName")
        .lean();

      // ======================================================
      // MAPS
      // ======================================================

      const vendorMap = {};

      vendorCompanies.forEach((vendor) => {
        vendorMap[vendor.vendorId.toString()] = vendor;
      });

      const variantMap = {};

      variants.forEach((variant) => {
        const pid = variant.productId.toString();

        if (!variantMap[pid]) {
          variantMap[pid] = [];
        }

        variantMap[pid].push(variant);
      });

      // ======================================================
      // FINAL DATA
      // ======================================================

      let finalProducts = paginatedProducts.map((product) => {
        const productVariants = variantMap[product._id.toString()] || [];

        const defaultVariant =
          productVariants.find(
            (v) => v._id.toString() === product.defaultVariantId?.toString(),
          ) || productVariants[0];

        return {
          productId: product._id,

          variantId: defaultVariant?._id || null,

          name: product.name,

          slug: product.slug,

          // image: product.images?.[0] || null,

          shopName:
            vendorMap[product.vendorId?.toString()]?.companyName || null,

          leadTime: product.leadTime,

          pricing: {
            price: defaultVariant?.price || 0,

            mrp: defaultVariant?.mrp || 0,

            discount: defaultVariant?.discount || 0,

            discountAmount: defaultVariant?.discountAmount || 0,
          },

          stock: {
            availableStock: defaultVariant?.stock || 0,
          },

          moq: defaultVariant?.moq || 1,

          rating: {
            average: product.avgRating || 0,

            totalReviews: product.reviewCount || 0,
          },
        };
      });

      // ======================================================
      // SORT BY PRICE
      // ======================================================

      finalProducts.sort((a, b) => a.pricing.price - b.pricing.price);

      // ======================================================
      // RESPONSE
      // ======================================================

      const result = {
        success: true,

        message: "Same slug products fetched successfully",

        pagination: {
          total,

          page: Number(page),

          limit: Number(limit),

          totalPages: Math.ceil(total / Number(limit)),
        },

        data: finalProducts,
      };

      // ======================================================
      // CACHE SAVE
      // ======================================================

      await RedisCache.set(cacheKey, result);

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async toggleProduct(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        throw new APIError(404, "Product not found");
      }
      // FIX: remove invalid geo data
      if (
        product.vendorLocation &&
        (!product.vendorLocation.coordinates ||
          product.vendorLocation.coordinates.length !== 2)
      ) {
        product.vendorLocation = undefined;
      }
      product.disable = !product.disable;
      await product.save();

      await createActivityLog({
        req,

        action: product.disable ? "DISABLE_PRODUCT" : "ENABLE_PRODUCT",

        module: "PRODUCT",

        targetId: product._id,

        details: {
          productName: product.name,
          oldStatus,
          newStatus: product.disable,
          vendorId: product.vendorId,
        },
      });

      await Promise.all([
        RedisCache.deletePattern("products:public:v2:*"),
        RedisCache.deletePattern("products:admin:v1:*"),
        RedisCache.deletePattern("products:vendor:*"),
        RedisCache.deletePattern("products:subcat:*"),
        RedisCache.deletePattern("products:*"), // optional full clear
        RedisCache.delete(`product:v1:${id}`),
        RedisCache.deletePattern(`products:cat:*`),
      ]);

      res.json({
        success: true,
        message: `Product disable status updated to ${product.disable}`,
        data: {
          disable: product.disable,
          product,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // static async verifyProduct(req, res, next) {
  //   try {
  //     const { id } = req.params;
  //     const { varified } = req.body;

  //     const product = await Product.findByIdAndUpdate(
  //       id,
  //       { varified: Boolean(varified) },
  //       { new: true },
  //     );

  //     if (!product) {
  //       throw new APIError(404, "Product not found");
  //     }

  //     //  smart cache clear
  //     await RedisCache.deletePattern?.("products:*");
  //     await RedisCache.delete?.(`product:v1:${id}`);

  //     res.json({
  //       status: "success",
  //       message: `Product ${varified ? "verified" : "unverified"} successfully`,
  //       data: { product },
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  static async verifyProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { varified, reason } = req.body;

      if (varified === false && !reason) {
        throw new APIError(400, "Reason is required when un-verifying product");
      }

      let finalReason = reason;
      if (varified === true && !reason) {
        finalReason = "Product verified and approved by admin";
      }

      const product = await Product.findByIdAndUpdate(
        id,
        {
          varified: Boolean(varified),
          verifyReason: finalReason,
        },
        { new: true },
      );

      if (!product) {
        throw new APIError(404, "Product not found");
      }

      await createActivityLog({
        req,

        action: varified ? "VERIFY_PRODUCT" : "UNVERIFY_PRODUCT",

        module: "PRODUCT",

        targetId: product._id,

        details: {
          productName: product.name,
          vendorId: product.vendorId,
          verified: Boolean(varified),
          reason: finalReason,
        },
      });

      await Promise.all([
        RedisCache.deletePattern("products:public:v2:*"),
        RedisCache.deletePattern("products:admin:v1:*"),
        RedisCache.deletePattern("products:vendor:*"),
        RedisCache.deletePattern("products:subcat:*"),
        RedisCache.deletePattern("products:*"), // optional full clear
        RedisCache.delete(`product:v1:${id}`),
        RedisCache.deletePattern(`products:cat:*`),
        RedisCache.deletePattern(`home:*`),
      ]);

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

  // trending Product

  //asgar ---> flash sale
  // static async setFlashSale(req, res) {
  //   try {
  //     const { productId } = req.params;
  //     const { discount, startDateTime, endDateTime, label } = req.body;
  //     if (new Date(startDateTime) >= new Date(endDateTime)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "End date/time must be greater than start date/time",
  //       });
  //     }

  //     const product = await Product.findByIdAndUpdate(
  //       productId,
  //       {
  //         flashSale: {
  //           isActive: true,
  //           discount,
  //           startDateTime: new Date(startDateTime),
  //           endDateTime: new Date(endDateTime),
  //           label: label || "",
  //         },
  //       },
  //       { new: true },
  //     );

  //     if (!product) {
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Product nahi mila" });
  //     }

  //     res.status(200).json({ success: true, product });
  //   } catch (error) {
  //     next(err);
  //   }
  // }

  // static async cancelFlashSale(req, res) {
  //   try {
  //     const { productId } = req.params;
  //     const product = await Product.findByIdAndUpdate(
  //       productId,
  //       { "flashSale.isActive": false },
  //       { new: true },
  //     );

  //     res.status(200).json({ success: true, product });
  //   } catch (error) {
  //     res.status(500).json({ success: false, message: error.message });
  //   }
  // }

  // static async getFlashSaleProducts(req, res) {
  //   try {
  //     const now = new Date();
  //     const page = parseInt(req.query.page) || 1;
  //     const limit = parseInt(req.query.limit) || 10;
  //     const skip = (page - 1) * limit;
  //     const sortBy = req.query.sortBy || "flashSale.startDateTime"; // createdAt, discount, avgRating
  //     const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  //     const filter = {
  //       "flashSale.isActive": true,
  //       "flashSale.startDateTime": { $lte: now },
  //       "flashSale.endDateTime": { $gte: now },
  //       disable: false,
  //     };

  //     const [products, total] = await Promise.all([
  //       Product.find(filter)
  //         .populate("brandId categoryId subcategoryId")
  //         .sort({ [sortBy]: sortOrder })
  //         .skip(skip)
  //         .limit(limit)
  //         .lean(),
  //       Product.countDocuments(filter),
  //     ]);

  //     res.status(200).json({
  //       success: true,
  //       products,
  //       pagination: {
  //         total,
  //         page,
  //         limit,
  //         totalPages: Math.ceil(total / limit),
  //         hasNextPage: page < Math.ceil(total / limit),
  //         hasPrevPage: page > 1,
  //       },
  //     });
  //   } catch (error) {
  //     res.status(500).json({ success: false, message: error.message });
  //   }
  // }
  //priyanshu
  // ===================== TOP SELLING PRODUCTS =====================
  static async getTopSellingProducts(req, res, next) {
    try {
      const { limit = 10, days, moduleId, pcategoryId } = req.query;

      const safeLimit = Math.min(parseInt(limit), 50);
      const cacheKey = `products:top-selling:v1:${JSON.stringify(req.query)}`;
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const toObjectId = (id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null;

      const matchStage = {
        disable: false,
        varified: true,
        sold: { $gt: 0 },
      };

      if (moduleId) matchStage.moduleId = toObjectId(moduleId);
      if (pcategoryId) matchStage.pcategoryId = toObjectId(pcategoryId);

      if (days && !isNaN(Number(days))) {
        matchStage.updatedAt = {
          $gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000),
        };
      }
      // console.log(matchStage);

      const pipeline = [
        { $match: matchStage },
        { $sort: { sold: -1 } },
        { $limit: safeLimit },
        {
          $lookup: {
            from: "variants",
            let: { pid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$pid"] },
                  disable: false,
                },
              },
              { $sort: { price: 1 } },
              { $limit: 1 },
              {
                $project: {
                  price: 1,
                  mrp: 1,
                  discount: 1,
                  discountAmount: 1,
                  Type: 1,
                },
              },
            ],
            as: "defaultVariant",
          },
        },

        { $match: { defaultVariant: { $ne: [] } } },

        {
          $lookup: {
            from: "brands",
            localField: "brandId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1 } }],
            as: "brandId",
          },
        },
        { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            name: 1,
            slug: 1,
            thumbnail: 1,
            images: 1,
            sold: 1,
            avgRating: 1,
            reviewCount: 1,
            measurementUnit: 1,
            features: 1,
            disable: 1,
            varified: 1,
            vendorId: 1,
            categoryId: 1,
            subcategoryId: 1,
            "brandId.name": 1,
            defaultVariant: { $arrayElemAt: ["$defaultVariant", 0] },
          },
        },
      ];

      const products = await Product.aggregate(pipeline);

      const response = {
        success: true,
        message: "Top selling products fetched successfully",
        results: products.length,
        data: { products },
      };

      await RedisCache.set(cacheKey, response, 300);

      return res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // static async getProductBySubCategory(req, res) {
  //   try {
  //     const { subcategoryId } = req.params;
  //     const { page = 1, limit = 10, type } = req.query;

  //     const skip = (page - 1) * limit;

  //     const filter = {
  //       subcategoryId,
  //     };

  //     if (type) {
  //       const variantIds = await Variant.find({
  //         Type: { $regex: new RegExp(`^${type}$`, "i") }, // case insensitive
  //       }).select("_id");

  //       filter.defaultVariantId = {
  //         $in: variantIds.map((v) => v._id),
  //       };
  //     }

  //     const products = await Product.find(filter)
  //       .select(
  //         "name images avgRating reviewCount slug properties minDiscount maxDiscount vendorId defaultVariantId",
  //       )
  //       .populate({
  //         path: "vendorId",
  //         select: "firstName lastName",
  //       })
  //       .populate({
  //         path: "defaultVariantId",
  //         select: "price discount Type",
  //       })
  //       .skip(skip)
  //       .limit(Number(limit));

  //     const formattedProducts = products.map((p) => ({
  //       id: p._id,
  //       name: p.name,
  //       images: p.images,
  //       avgRating: p.avgRating,
  //       reviewCount: p.reviewCount,
  //       slug: p.slug,
  //       properties: p.properties,
  //       minDiscount: p.minDiscount,
  //       maxDiscount: p.maxDiscount,

  //       vendor: {
  //         firstName: p.vendorId?.firstName,
  //         lastName: p.vendorId?.lastName,
  //       },

  //       price: p.defaultVariantId?.price ?? null,
  //       discount: p.defaultVariantId?.discount ?? null,
  //       type: p.defaultVariantId?.Type ?? null,
  //     }));

  //     const total = await Product.countDocuments(filter);

  //     res.json({
  //       success: true,
  //       page: Number(page),
  //       totalPages: Math.ceil(total / limit),
  //       totalProducts: total,
  //       products: formattedProducts,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: error.message });
  //   }
  // }

  // static async getProductBySubCategory(req, res) {
  //   try {
  //     const { subcategoryId } = req.params;
  //     const { page = 1, limit = 10, type } = req.query;

  //     const cacheKey = `products:subcat:${subcategoryId}:page:${page}:limit:${limit}:type:${type || "all"}`;

  //     // 1. CHECK CACHE
  //     // const cachedData = await RedisCache.get(cacheKey);
  //     // if (cachedData) {
  //     //   // console.log("CACHE HIT");
  //     //   return res.json(JSON.parse(cachedData));
  //     // }

  //     // console.log("CACHE MISS");

  //     const skip = (page - 1) * limit;

  //     const filter = { subcategoryId };

  //     if (type) {
  //       const variantIds = await Variant.find({
  //         Type: { $regex: new RegExp(`^${type}$`, "i") },
  //       }).select("_id");

  //       filter.defaultVariantId = {
  //         $in: variantIds.map((v) => v._id),
  //       };
  //     }

  //     // const products = await Product.find(filter)
  //     //   .select(
  //     //     "name images avgRating reviewCount slug properties minDiscount maxDiscount vendorId defaultVariantId",
  //     //   )
  //     //   .populate({
  //     //     path: "vendorId",
  //     //     select: "firstName lastName",
  //     //   })
  //     //   .populate({
  //     //     path: "defaultVariantId",
  //     //     select: "price discount Type",
  //     //   })
  //     //   .skip(skip)
  //     //   .limit(Number(limit));

  //     const products = await Product.find(filter)
  //       .select(
  //         "name images avgRating reviewCount slug properties minDiscount maxDiscount vendorId defaultVariantId",
  //       )
  //       .populate({
  //         path: "vendorId",
  //         select: "firstName lastName",
  //       })
  //       .populate({
  //         path: "defaultVariantId", // full data
  //       })
  //       .skip(skip)
  //       .limit(Number(limit));

  //     const formattedProducts = products.map((p) => ({
  //       id: p._id,
  //       name: p.name,
  //       images: p.images,
  //       avgRating: p.avgRating,
  //       reviewCount: p.reviewCount,
  //       slug: p.slug,
  //       properties: p.properties,
  //       minDiscount: p.minDiscount,
  //       maxDiscount: p.maxDiscount,
  //       vendor: {
  //         firstName: p.vendorId?.firstName,
  //         lastName: p.vendorId?.lastName,
  //       },
  //       price: p.defaultVariantId?.price ?? null,
  //       discount: p.defaultVariantId?.discount ?? null,
  //       type: p.defaultVariantId?.Type ?? null,
  //     }));

  //     const total = await Product.countDocuments(filter);

  //     const response = {
  //       success: true,
  //       page: Number(page),
  //       totalPages: Math.ceil(total / limit),
  //       totalProducts: total,
  //       products: formattedProducts,
  //     };

  //     //  2. SET CACHE
  //     await RedisCache.set(cacheKey, JSON.stringify(response), 300);

  //     res.json(response);
  //   } catch (error) {
  //     // console.error(error);
  //     res.status(500).json({ message: error.message });
  //   }
  // }

  //draft product for vendor
  static async getProductBySubCategory(req, res) {
    try {
      const { subcategoryId } = req.params;
      const { page = 1, limit = 10, type } = req.query;

      const cacheKey = `products:subcat:${subcategoryId}:page:${page}:limit:${limit}:type:${type || "all"}`;

      // 1. CHECK CACHE
      const cachedData = await RedisCache.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const skip = (page - 1) * limit;

      const filter = { subcategoryId };

      if (type) {
        const variantIds = await Variant.find({
          Type: { $regex: new RegExp(`^${type}$`, "i") },
        }).select("_id");

        filter.defaultVariantId = {
          $in: variantIds.map((v) => v._id),
        };
      }

      const products = await Product.find(filter)
        .select(
          "name images avgRating reviewCount slug properties minDiscount maxDiscount vendorId defaultVariantId",
        )
        .populate({
          path: "vendorId",
          select: "firstName lastName",
        })
        .populate({
          path: "defaultVariantId",
        })
        .skip(skip)
        .limit(Number(limit));

      const formattedProducts = products.map((p) => ({
        id: p._id,
        name: p.name,
        images: p.images,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        slug: p.slug,
        properties: p.properties,
        minDiscount: p.minDiscount,
        maxDiscount: p.maxDiscount,

        vendor: {
          firstName: p.vendorId?.firstName,
          lastName: p.vendorId?.lastName,
        },

        // quick access fields (frontend fast rendering)
        price: p.defaultVariantId?.price ?? null,
        discount: p.defaultVariantId?.discount ?? null,
        type: p.defaultVariantId?.Type ?? null,

        defaultVariant: p.defaultVariantId || null,
      }));

      const total = await Product.countDocuments(filter);

      const response = {
        success: true,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        products: formattedProducts,
      };

      // 2. SET CACHE (5 min)
      await RedisCache.set(cacheKey, JSON.stringify(response), 300);

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getDraftProducts(req, res, next) {
    try {
      const { page = 1, limit = 20, search } = req.query;

      const vendorId = req.user.id; // logged-in vendor

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const matchStage = {
        status: "DRAFT",
        vendorId: new mongoose.Types.ObjectId(vendorId), // key line
      };

      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        { $match: matchStage },

        // ✅ variant lookup
        {
          $lookup: {
            from: "variants",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$productId"] },
                },
              },
              { $sort: { price: 1 } },
              { $limit: 1 },
              {
                $project: {
                  price: 1,
                  mrp: 1,
                  discount: 1,
                  Type: 1,
                },
              },
            ],
            as: "defaultVariant",
          },
        },

        {
          $addFields: {
            defaultVariant: { $arrayElemAt: ["$defaultVariant", 0] },
          },
        },

        {
          $facet: {
            products: [{ $skip: skip }, { $limit: limitNum }],
            totalCount: [{ $count: "count" }],
          },
        },

        {
          $addFields: {
            total: { $arrayElemAt: ["$totalCount.count", 0] },
          },
        },
      ];

      const result = await Product.aggregate(pipeline);

      const products = result[0]?.products || [];
      const total = result[0]?.total || 0;

      const response = {
        success: true,
        message: "Draft products fetched successfully",
        results: products.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: { products },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateProductStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // "DRAFT" | "ACTIVE"

      if (!["DRAFT", "ACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be DRAFT or ACTIVE",
        });
      }

      const product = await Product.findOne({
        _id: id,
        vendorId: req.user.id, //security (own product only)
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      product.status = status;
      await product.save();

      await Promise.all([
        RedisCache.deletePattern(`products:*`),
        RedisCache.deletePattern(`products:draft:${req.user.id}:*`),
        RedisCache.delete(`product:v1:${id}`),
      ]);

      res.json({
        success: true,
        message: `Product moved to ${status}`,
        data: {
          status: product.status,
          product,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // static async getProductByCategory(req, res) {
  //   try {
  //     const { categoryId } = req.params;

  //     const { page = 1, limit = 10, type, brand, size, sort } = req.query;

  //     const cacheKey = `products:cat:${categoryId}:page:${page}:limit:${limit}:type:${type || "all"}:brand:${brand || "all"}:size:${size || "all"}:sort:${sort || "default"}`;

  //     // =========================
  //     // CACHE CHECK
  //     // =========================
  //     const cachedData = await RedisCache.get(cacheKey);

  //     if (cachedData) {
  //       return res.json(JSON.parse(cachedData));
  //     }

  //     const skip = (page - 1) * limit;

  //     const filter = {};

  //     // =========================
  //     // CATEGORY FILTER
  //     // =========================
  //     if (categoryId !== "all") {
  //       filter.categoryId = categoryId;
  //     }

  //     // =========================
  //     // TYPE FILTER
  //     // =========================
  //     if (type) {
  //       const variantIds = await Variant.find({
  //         Type: { $regex: new RegExp(`^${type}$`, "i") },
  //       }).distinct("_id");

  //       filter.defaultVariantId = {
  //         $in: variantIds,
  //       };
  //     }

  //     // =========================
  //     // BRAND FILTER
  //     // =========================
  //     if (brand) {
  //       const brandIds = await Brand.find({
  //         name: { $regex: new RegExp(brand, "i") },
  //       }).distinct("_id");

  //       filter.brandId = { $in: brandIds };
  //     }

  //     // =========================
  //     // FETCH PRODUCTS
  //     // =========================
  //     let products = await Product.find(filter)
  //       .select(
  //         `
  //       name
  //       images
  //       brandId
  //       avgRating
  //       reviewCount
  //       slug
  //       properties
  //       minDiscount
  //       maxDiscount
  //       vendorId
  //       defaultVariantId
  //       createdAt
  //     `,
  //       )
  //       .populate({
  //         path: "vendorId",
  //         select: "firstName lastName",
  //       })
  //       .populate({
  //         path: "brandId",
  //         select: "name",
  //       })
  //       .populate({
  //         path: "defaultVariantId",
  //       })
  //       .lean();

  //     // =========================
  //     // SIZE FILTER
  //     // =========================
  //     if (size) {
  //       products = products.filter((p) => {
  //         const weight = Number(p?.defaultVariantId?.packageWeight || 0);

  //         switch (size.toLowerCase()) {
  //           case "small":
  //             return weight < 10;

  //           case "medium":
  //             return weight >= 10 && weight <= 50;

  //           case "large":
  //             return weight > 50 && weight <= 200;

  //           case "extra_large":
  //             return weight > 200;

  //           default:
  //             return true;
  //         }
  //       });
  //     }

  //     // =========================
  //     // SORTING
  //     // =========================
  //     if (sort) {
  //       switch (sort) {
  //         case "low_to_high":
  //           products.sort(
  //             (a, b) =>
  //               (a.defaultVariantId?.price || 0) -
  //               (b.defaultVariantId?.price || 0),
  //           );
  //           break;

  //         case "high_to_low":
  //           products.sort(
  //             (a, b) =>
  //               (b.defaultVariantId?.price || 0) -
  //               (a.defaultVariantId?.price || 0),
  //           );
  //           break;

  //         case "newest_first":
  //           products.sort(
  //             (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  //           );
  //           break;

  //         case "most_popular":
  //           products.sort(
  //             (a, b) =>
  //               (b.defaultVariantId?.sold || 0) -
  //               (a.defaultVariantId?.sold || 0),
  //           );
  //           break;

  //         case "best_rating":
  //           products.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  //           break;
  //       }
  //     }

  //     // =========================
  //     // TOTAL AFTER FILTER
  //     // =========================
  //     const total = products.length;

  //     // =========================
  //     // PAGINATION
  //     // =========================
  //     const paginatedProducts = products.slice(skip, skip + Number(limit));

  //     // =========================
  //     // RESPONSE FORMAT
  //     // =========================
  //     const formattedProducts = paginatedProducts.map((p) => ({
  //       id: p._id,

  //       name: p.name,

  //       images: p.images,

  //       avgRating: p.avgRating,

  //       reviewCount: p.reviewCount,

  //       properties: p.properties,

  //       minDiscount: p.minDiscount,

  //       maxDiscount: p.maxDiscount,

  //       brand: p.brandId?.name || null,

  //       vendor: {
  //         firstName: p.vendorId?.firstName,
  //         lastName: p.vendorId?.lastName,
  //       },

  //       // quick access fields
  //       price: p.defaultVariantId?.price ?? null,

  //       discount: p.defaultVariantId?.discount ?? null,

  //       type: p.defaultVariantId?.Type ?? null,

  //       defaultVariant: p.defaultVariantId || null,
  //     }));

  //     // =========================
  //     // FILTER OPTIONS
  //     // =========================
  //     const filterOptions = {
  //       brand: [
  //         ...new Set(products.map((p) => p.brandId?.name).filter(Boolean)),
  //       ],

  //       size: ["small", "medium", "large", "extra_large"],

  //       sort: [
  //         "low_to_high",
  //         "high_to_low",
  //         "newest_first",
  //         "most_popular",
  //         "best_rating",
  //       ],
  //     };

  //     const response = {
  //       success: true,

  //       page: Number(page),

  //       totalPages: Math.ceil(total / limit),

  //       totalProducts: total,

  //       filters: filterOptions,

  //       products: formattedProducts,
  //     };

  //     // =========================
  //     // SET CACHE
  //     // =========================
  //     await RedisCache.set(cacheKey, JSON.stringify(response), 300);

  //     res.json(response);
  //   } catch (error) {
  //     res.status(500).json({
  //       message: error.message,
  //     });
  //   }
  // }

  static async getProductByCategory(req, res) {
    try {
      const { categoryId } = req.params;

      const {
        page = 1,
        limit = 10,
        type,
        brand,
        size,
        sort,
        search, // ✅ NEW ADDED
      } = req.query;

      const cacheKey = `products:cat:${categoryId}:page:${page}:limit:${limit}:type:${type || "all"}:brand:${brand || "all"}:size:${size || "all"}:sort:${sort || "default"}:search:${search || "all"}`;

      // =========================
      // CACHE CHECK
      // =========================
      const cachedData = await RedisCache.get(cacheKey);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const skip = (page - 1) * limit;

      const filter = {};

      // =========================
      // CATEGORY FILTER
      // =========================
      if (categoryId !== "all") {
        filter.categoryId = categoryId;
      }

      // =========================
      // TYPE FILTER
      // =========================
      if (type) {
        const variantIds = await Variant.find({
          Type: { $regex: new RegExp(`^${type}$`, "i") },
        }).distinct("_id");

        filter.defaultVariantId = {
          $in: variantIds,
        };
      }

      // =========================
      // BRAND FILTER
      // =========================
      if (brand) {
        const brandIds = await Brand.find({
          name: { $regex: new RegExp(brand, "i") },
        }).distinct("_id");

        filter.brandId = { $in: brandIds };
      }

      // =========================
      // 🔥 SEARCH FILTER (NEW)
      // =========================
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      // =========================
      // FETCH PRODUCTS
      // =========================
      let products = await Product.find(filter)
        .select(
          `
        name
        images
        brandId
        avgRating
        reviewCount
        slug
        properties
        minDiscount
        maxDiscount
        vendorId
        defaultVariantId
        createdAt
      `,
        )
        .populate({
          path: "vendorId",
          select: "firstName lastName",
        })
        .populate({
          path: "brandId",
          select: "name",
        })
        .populate({
          path: "defaultVariantId",
        })
        .lean();

      // =========================
      // SIZE FILTER
      // =========================
      if (size) {
        products = products.filter((p) => {
          const weight = Number(p?.defaultVariantId?.packageWeight || 0);

          switch (size.toLowerCase()) {
            case "small":
              return weight < 10;

            case "medium":
              return weight >= 10 && weight <= 50;

            case "large":
              return weight > 50 && weight <= 200;

            case "extra_large":
              return weight > 200;

            default:
              return true;
          }
        });
      }

      // =========================
      // SORTING
      // =========================
      if (sort) {
        switch (sort) {
          case "low_to_high":
            products.sort(
              (a, b) =>
                (a.defaultVariantId?.price || 0) -
                (b.defaultVariantId?.price || 0),
            );
            break;

          case "high_to_low":
            products.sort(
              (a, b) =>
                (b.defaultVariantId?.price || 0) -
                (a.defaultVariantId?.price || 0),
            );
            break;

          case "newest_first":
            products.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            );
            break;

          case "most_popular":
            products.sort(
              (a, b) =>
                (b.defaultVariantId?.sold || 0) -
                (a.defaultVariantId?.sold || 0),
            );
            break;

          case "best_rating":
            products.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
            break;
        }
      }

      // =========================
      // TOTAL AFTER FILTER
      // =========================
      const total = products.length;

      // =========================
      // PAGINATION
      // =========================
      const paginatedProducts = products.slice(skip, skip + Number(limit));

      // =========================
      // RESPONSE FORMAT
      // =========================
      const formattedProducts = paginatedProducts.map((p) => ({
        id: p._id,
        name: p.name,
        images: p.images,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        properties: p.properties,
        minDiscount: p.minDiscount,
        maxDiscount: p.maxDiscount,
        brand: p.brandId?.name || null,
        vendor: {
          firstName: p.vendorId?.firstName,
          lastName: p.vendorId?.lastName,
        },
        price: p.defaultVariantId?.price ?? null,
        discount: p.defaultVariantId?.discount ?? null,
        type: p.defaultVariantId?.Type ?? null,
        defaultVariant: p.defaultVariantId || null,
      }));

      // =========================
      // FILTER OPTIONS
      // =========================
      const filterOptions = {
        brand: [
          ...new Set(products.map((p) => p.brandId?.name).filter(Boolean)),
        ],
        size: ["small", "medium", "large", "extra_large"],
        sort: [
          "low_to_high",
          "high_to_low",
          "newest_first",
          "most_popular",
          "best_rating",
        ],
      };

      const response = {
        success: true,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        filters: filterOptions,
        products: formattedProducts,
      };

      // =========================
      // CACHE SET
      // =========================
      await RedisCache.set(cacheKey, JSON.stringify(response), 300);

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }

  static async getProductByVendorBrand(req, res) {
    try {
      const { vendorId, brandId } = req.params;
      const { page = 1, limit = 10, Type } = req.query;

      const cacheKey = `products:vendor:${vendorId}:brand:${brandId}:page:${page}:limit:${limit}:type:${Type || "all"}`;

      // 1. CACHE CHECK
      const cachedData = await RedisCache.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const skip = (page - 1) * limit;

      // 2. BASE FILTER
      const filter = {
        vendorId,
        brandId,
      };

      // 3. TYPE FILTER (BULK / RETAIL)
      if (Type) {
        filter["defaultVariantId"] = {
          $in: await Variant.find({
            Type: { $regex: new RegExp(`^${Type}$`, "i") },
          }).distinct("_id"),
        };
      }

      // 4. QUERY
      const products = await Product.find(filter)
        .select(
          "name images avgRating reviewCount slug properties vendorId defaultVariantId",
        )
        .populate({
          path: "vendorId",
          select: "firstName lastName",
        })
        .populate({
          path: "defaultVariantId",
          select: "price discount Type",
        })
        .skip(skip)
        .limit(Number(limit));

      // 5. FORMAT RESPONSE
      const formattedProducts = products.map((p) => ({
        id: p._id,
        name: p.name,
        images: p.images,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        slug: p.slug,
        properties: p.properties,
        vendor: {
          firstName: p.vendorId?.firstName,
          lastName: p.vendorId?.lastName,
        },
        categoryId: p.categoryId,
        price: p.defaultVariantId?.price ?? null,
        discount: p.defaultVariantId?.discount ?? null,
        type: p.defaultVariantId?.Type ?? null,
      }));

      const total = await Product.countDocuments(filter);

      const response = {
        success: true,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        products: formattedProducts,
      };

      await RedisCache.set(cacheKey, JSON.stringify(response), 300);

      return res.json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // static async getProductsByBrand(req, res) {
  //   try {
  //     const { brandId } = req.params;

  //     const { page = 1, limit = 10, Type, category, size, sort } = req.query;

  //     const skip = (Number(page) - 1) * Number(limit);
  //     const filter = {
  //       brandId,
  //       disable: false,
  //       varified: true,
  //     };
  //     const cacheKey = `products:brand:${brandId}:page:${page}:limit:${limit}:type:${Type || "all"}:category:${category || "all"}:size:${size || "all"}:sort:${sort || "default"}`;
  //     const cachedData = await RedisCache.get(cacheKey);
  //     if (cachedData) {
  //       return res.json(JSON.parse(cachedData));
  //     }

  //     // =========================
  //     // TYPE FILTER
  //     // =========================
  //     if (Type) {
  //       const variantFilterIds = await Variant.find({
  //         Type: { $regex: new RegExp(`^${Type}$`, "i") },
  //       }).distinct("_id");

  //       filter.defaultVariantId = { $in: variantFilterIds };
  //     }

  //     // =========================
  //     // CATEGORY FILTER
  //     // =========================
  //     if (category) {
  //       const categoryIds = await Category.find({
  //         name: { $regex: new RegExp(category, "i") },
  //       }).distinct("_id");

  //       filter.categoryId = { $in: categoryIds };
  //     }

  //     // =========================
  //     // FETCH PRODUCTS
  //     // =========================
  //     let products = await Product.find(filter)
  //       .select(
  //         `
  //       name
  //       images
  //       categoryId
  //       avgRating
  //       reviewCount
  //       slug
  //       properties
  //       vendorId
  //       defaultVariantId
  //       measurementUnit
  //       createdAt
  //     `,
  //       )
  //       .populate({
  //         path: "vendorId",
  //         select: "firstName lastName",
  //       })
  //       .populate({
  //         path: "categoryId",
  //         select: "name",
  //       })
  //       .populate({
  //         path: "defaultVariantId",
  //         select:
  //           "_id price mrp discount Type stock moq packageWeight size sold",
  //       })
  //       .lean();

  //     // =========================
  //     // SIZE FILTER
  //     // =========================
  //     if (size) {
  //       products = products.filter((p) => {
  //         const weight = Number(p?.defaultVariantId?.packageWeight || 0);

  //         switch (size.toLowerCase()) {
  //           case "small":
  //             return weight < 10;

  //           case "medium":
  //             return weight >= 10 && weight <= 50;

  //           case "large":
  //             return weight > 50 && weight <= 200;

  //           case "extra_large":
  //             return weight > 200;

  //           default:
  //             return true;
  //         }
  //       });
  //     }

  //     // =========================
  //     // SORTING
  //     // =========================
  //     if (sort) {
  //       switch (sort) {
  //         case "low_to_high":
  //           products.sort(
  //             (a, b) =>
  //               (a.defaultVariantId?.price || 0) -
  //               (b.defaultVariantId?.price || 0),
  //           );
  //           break;

  //         case "high_to_low":
  //           products.sort(
  //             (a, b) =>
  //               (b.defaultVariantId?.price || 0) -
  //               (a.defaultVariantId?.price || 0),
  //           );
  //           break;

  //         case "newest_first":
  //           products.sort(
  //             (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  //           );
  //           break;

  //         case "most_popular":
  //           products.sort(
  //             (a, b) =>
  //               (b.defaultVariantId?.sold || 0) -
  //               (a.defaultVariantId?.sold || 0),
  //           );
  //           break;
  //       }
  //     }

  //     // =========================
  //     // TOTAL AFTER FILTER
  //     // =========================
  //     const total = products.length;

  //     // =========================
  //     // PAGINATION
  //     // =========================
  //     const paginatedProducts = products.slice(skip, skip + Number(limit));

  //     // =========================
  //     // RESPONSE FORMAT
  //     // =========================
  //     const formattedProducts = paginatedProducts.map((p) => {
  //       const variant = p.defaultVariantId;

  //       return {
  //         id: p._id,

  //         name: p.name,

  //         images: p.images,

  //         avgRating: p.avgRating,

  //         reviewCount: p.reviewCount,

  //         slug: p.slug,

  //         categoryId: p.categoryId,

  //         vendor: {
  //           firstName: p.vendorId?.firstName || null,
  //           lastName: p.vendorId?.lastName || null,
  //         },

  //         variant: variant
  //           ? {
  //               id: variant._id,
  //               price: variant.price,
  //               mrp: variant.mrp,
  //               discount: variant.discount,
  //               type: variant.Type,
  //               stock: variant.stock,
  //               sold: variant.sold || 0,
  //               moq: variant.moq,
  //               packageWeight: variant.packageWeight || " ",
  //               size: variant.size || " ",
  //             }
  //           : null,

  //         measurementUnit: p.measurementUnit || " ",
  //       };
  //     });

  //     // =========================
  //     // FILTER OPTIONS
  //     // =========================
  //     const filterOptions = {
  //       category: [
  //         ...new Set(products.map((p) => p.categoryId?.name).filter(Boolean)),
  //       ],

  //       size: ["small", "medium", "large", "extra_large"],

  //       sort: ["low_to_high", "high_to_low", "newest_first", "most_popular"],
  //     };

  //     const response = {
  //       success: true,

  //       page: Number(page),

  //       totalPages: Math.ceil(total / limit),

  //       totalProducts: total,

  //       filters: filterOptions,

  //       products: formattedProducts,
  //     };

  //     await RedisCache.set(cacheKey, JSON.stringify(response), 300);

  //     return res.json({
  //       response,
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message,
  //     });
  //   }
  // }

  static async getProductsByBrand(req, res) {
    try {
      const { brandId } = req.params;

      const { page = 1, limit = 10, Type, category, size, sort } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const filter = {
        brandId,
        disable: false,
        varified: true,
      };

      const cacheKey = `products:brand:${brandId}:page:${page}:limit:${limit}:type:${Type || "all"}:category:${category || "all"}:size:${size || "all"}:sort:${sort || "default"}`;

      const cachedData = await RedisCache.get(cacheKey);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // =========================
      // CATEGORY FILTER
      // =========================

      if (category) {
        const categoryIds = await Category.find({
          name: { $regex: new RegExp(category, "i") },
        }).distinct("_id");

        filter.categoryId = { $in: categoryIds };
      }

      // =========================
      // FETCH PRODUCTS
      // =========================

      let products = await Product.find(filter)
        .select(
          `
        name
        images
        categoryId
        avgRating
        reviewCount
        slug
        properties
        vendorId
        defaultVariantId
        measurementUnit
        createdAt
      `,
        )
        .populate({
          path: "vendorId",
          select: "firstName lastName",
        })
        .populate({
          path: "categoryId",
          select: "name",
        })
        .lean();

      // =========================
      // GET ALL VARIANTS
      // =========================

      const productIds = products.map((p) => p._id);

      const allVariants = await Variant.find({
        productId: { $in: productIds },
      }).lean();

      // =========================
      // GROUP VARIANTS
      // =========================

      const variantMap = {};

      allVariants.forEach((variant) => {
        const productId = variant.productId.toString();

        if (!variantMap[productId]) {
          variantMap[productId] = [];
        }

        variantMap[productId].push({
          id: variant._id,
          price: variant.price,
          mrp: variant.mrp,
          discount: variant.discount,
          type: variant.Type,
          stock: variant.stock,
          sold: variant.sold || 0,
          moq: variant.moq,
          packageWeight: variant.packageWeight || "",
          size: variant.size || "",
          isDefault:
            variant._id.toString() ===
            products
              .find((p) => p._id.toString() === productId)
              ?.defaultVariantId?.toString(),
        });
      });

      // =========================
      // TYPE FILTER
      // =========================

      if (Type) {
        products = products.filter((product) => {
          const variants = variantMap[product._id.toString()] || [];

          return variants.some(
            (v) => v.type?.toLowerCase() === Type.toLowerCase(),
          );
        });
      }

      // =========================
      // SIZE FILTER
      // =========================

      if (size) {
        products = products.filter((product) => {
          const variants = variantMap[product._id.toString()] || [];

          return variants.some((v) => {
            const weight = Number(v.packageWeight || 0);

            switch (size.toLowerCase()) {
              case "small":
                return weight < 10;

              case "medium":
                return weight >= 10 && weight <= 50;

              case "large":
                return weight > 50 && weight <= 200;

              case "extra_large":
                return weight > 200;

              default:
                return true;
            }
          });
        });
      }

      // =========================
      // SORTING
      // =========================

      if (sort) {
        switch (sort) {
          case "low_to_high":
            products.sort((a, b) => {
              const aPrice = variantMap[a._id.toString()]?.[0]?.price || 0;

              const bPrice = variantMap[b._id.toString()]?.[0]?.price || 0;

              return aPrice - bPrice;
            });

            break;

          case "high_to_low":
            products.sort((a, b) => {
              const aPrice = variantMap[a._id.toString()]?.[0]?.price || 0;

              const bPrice = variantMap[b._id.toString()]?.[0]?.price || 0;

              return bPrice - aPrice;
            });

            break;

          case "newest_first":
            products.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            );

            break;

          case "most_popular":
            products.sort((a, b) => {
              const aSold = variantMap[a._id.toString()]?.[0]?.sold || 0;

              const bSold = variantMap[b._id.toString()]?.[0]?.sold || 0;

              return bSold - aSold;
            });

            break;
        }
      }

      // =========================
      // TOTAL AFTER FILTER
      // =========================

      const total = products.length;

      // =========================
      // PAGINATION
      // =========================

      const paginatedProducts = products.slice(skip, skip + Number(limit));

      // =========================
      // RESPONSE FORMAT
      // =========================

      const formattedProducts = paginatedProducts.map((p) => {
        return {
          id: p._id,

          name: p.name,

          images: p.images,

          avgRating: p.avgRating,

          reviewCount: p.reviewCount,

          slug: p.slug,

          categoryId: p.categoryId,

          vendor: {
            firstName: p.vendorId?.firstName || null,
            lastName: p.vendorId?.lastName || null,
          },

          variants: variantMap[p._id.toString()] || [],

          measurementUnit: p.measurementUnit || "",
        };
      });

      // =========================
      // FILTER OPTIONS
      // =========================

      const filterOptions = {
        category: [
          ...new Set(products.map((p) => p.categoryId?.name).filter(Boolean)),
        ],

        size: ["small", "medium", "large", "extra_large"],

        sort: ["low_to_high", "high_to_low", "newest_first", "most_popular"],
      };

      const response = {
        success: true,

        page: Number(page),

        totalPages: Math.ceil(total / limit),

        totalProducts: total,

        filters: filterOptions,

        products: formattedProducts,
      };

      await RedisCache.set(cacheKey, JSON.stringify(response), 300);

      return res.json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getDailyHotDeals(req, res) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const cacheKey = `daily_deals:${today}`;
      // 1. Cache Check
      const cached = await RedisCache.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));

      let products = await Product.aggregate([
        {
          $match: {
            varified: true,
            disable: false,
            status: "ACTIVE",
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: "variants",
            localField: "defaultVariantId",
            foreignField: "_id",
            as: "v",
          },
        },
        { $unwind: "$v" },
        {
          $match: {
            $or: [{ "v.discount": { $gte: 5 } }, { avgRating: { $gte: 4 } }],
          },
        },
        { $sample: { size: 10 } },
        {
          $project: {
            id: "$_id",
            name: 1,
            defaultVariantId: 1,
            slug: 1,
            images: 1,
            avgRating: 1,
            reviewCount: 1,
            price: "$v.price",
            mrp: "$v.mrp",
            discount: "$v.discount",
            type: "$v.Type",
          },
        },
      ]);

      if (!products || products.length === 0) {
        const fallbackItems = await Product.find({
          varified: true,
          disable: false,
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("defaultVariantId")
          .lean();

        products = fallbackItems.map((p) => ({
          // id: p._id,
          defaultVariantId: p.defaultVariantId,
          name: p.name,
          slug: p.slug,
          images: p.images,
          avgRating: p.avgRating,
          price: p.defaultVariantId?.price || 0,
          mrp: p.defaultVariantId?.mrp || 0,
          discount: p.defaultVariantId?.discount || 0,
          type: p.defaultVariantId?.Type || null,
        }));
      }

      const response = {
        success: true,
        count: products.length,
        date: new Date(),
        products,
      };

      // Cache results
      if (products.length > 0) {
        await RedisCache.set(cacheKey, JSON.stringify(response), 86400);
      }

      return res.json(response);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async parseFormDataJSON(req, res, next) {
    try {
      const fields = [
        "variants",
        "shippingCharges",
        "properties",
        "metaData",
        "deliveryOptions",
        "serviceableDeliveryPincode",
        "subcategoryId",
        "productTypeId",
      ];

      for (let field of fields) {
        if (req.body[field] && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: `Invalid JSON in field: ${field}`,
            });
          }
        }
      }

      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Parsing error in form-data",
      });
    }
  }
}

export default ProductController;
