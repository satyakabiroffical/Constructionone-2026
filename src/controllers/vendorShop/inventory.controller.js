import Variant from "../../models/vendorShop/variant.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import RedisCache from "../../utils/redisCache.js";
import mongoose from "mongoose";

// export const getInventory = async (req, res, next) => {
//   try {
//     const vendorId = req.user.id || "699c16b0e4bbd8cf25acc76b";
//     // const vendorId = req.user.id;

//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       type = "ALL", // ALL | BULK | RETAIL
//     } = req.query;

//     page = Number(page);
//     limit = Number(limit);
//     const skip = (page - 1) * limit;

//     // --------------------------------
//     // MAIN QUERY
//     // --------------------------------
//     let query = {
//       createdBy: vendorId, // agar field nahi hai to hata dena
//     };

//     // BULK / RETAIL filter
//     if (type !== "ALL") {
//       query.Type = type; // correct field name
//     }

//     // --------------------------------
//     // PRODUCT NAME SEARCH
//     // --------------------------------
//     let productMatch = {};

//     if (search) {
//       productMatch.name = {
//         $regex: search,
//         $options: "i",
//       };
//     }

//     // --------------------------------
//     // FIND + POPULATE
//     // --------------------------------
//     let variants = await Variant.find(query)
//       .populate({
//         path: "productId",
//         match: productMatch,
//         select: "name images categoryId",
//         populate: {
//           path: "categoryId",
//           select: "name",
//         },
//       })
//       .sort({ createdAt: -1 });

//     // populate ke baad null remove
//     variants = variants.filter((item) => item.productId !== null);

//     // pagination AFTER filter
//     const total = variants.length;
//     variants = variants.slice(skip, skip + limit);

//     res.status(200).json({
//       success: true,
//       message: "Inventory fetched successfully",
//       filters: {
//         types: ["ALL", "BULK", "RETAIL"],
//       },

//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         perPage: limit,
//       },

//       data: variants,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

export const getInventory = async (req, res, next) => {
  try {
    // const vendorId = "699c16b0e4bbd8cf25acc76b";
    const vendorId = req.user.id;

    let {
      page = 1,
      limit = 10,
      search = "",
      type = "ALL", // ALL | BULK | RETAIL
      categoryId = "",
      brandId = "",
      disable = "", // true / false
      stockSort = "", // LOW_STOCK
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    // -----------------------------------
    // MAIN QUERY
    // -----------------------------------
    let query = {
      createdBy: vendorId, // agar field nahi hai to hata dena
    };

    // Type Filter
    if (type !== "ALL") {
      query.Type = type;
    }

    // Category Filter
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Brand Filter
    if (brandId) {
      query.brandId = brandId;
    }

    // Disable Status Filter
    if (disable !== "") {
      query.disable = disable === "true";
    }

    // -----------------------------------
    // PRODUCT SEARCH
    // -----------------------------------
    let productMatch = {};

    if (search) {
      productMatch.name = {
        $regex: search,
        $options: "i",
      };
    }

    // -----------------------------------
    // SORTING
    // -----------------------------------
    let sortOption = {
      createdAt: -1,
    };

    // low stock sabse pehle
    if (stockSort === "LOW_STOCK") {
      sortOption = {
        stock: 1, // ascending => low stock first
      };
    }

    // -----------------------------------
    // FIND + POPULATE
    // -----------------------------------
    let variants = await Variant.find(query)
      .populate({
        path: "productId",
        match: productMatch,
        select: "name images categoryId brandId",
        populate: [
          {
            path: "categoryId",
            select: "name",
          },
          {
            path: "brandId",
            select: "name",
          },
        ],
      })
      .sort(sortOption);

    // null populated products remove
    variants = variants.filter((item) => item.productId !== null);

    // -----------------------------------
    // CATEGORY FILTER OPTIONS
    // -----------------------------------
    const categories = [
      ...new Map(
        variants
          .filter((v) => v.productId?.categoryId)
          .map((v) => [
            v.productId.categoryId._id.toString(),
            {
              _id: v.productId.categoryId._id,
              name: v.productId.categoryId.name,
            },
          ]),
      ).values(),
    ];

    // -----------------------------------
    // BRAND FILTER OPTIONS
    // -----------------------------------
    const brands = [
      ...new Map(
        variants
          .filter((v) => v.productId?.brandId)
          .map((v) => [
            v.productId.brandId._id.toString(),
            {
              _id: v.productId.brandId._id,
              name: v.productId.brandId.name,
            },
          ]),
      ).values(),
    ];

    // -----------------------------------
    // PAGINATION
    // -----------------------------------
    const total = variants.length;

    variants = variants.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",

      filters: {
        types: ["ALL", "BULK", "RETAIL"],
        disableStatus: [true, false],
        stockSort: ["LOW_STOCK"],
        categories,
        brands,
      },

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        perPage: limit,
      },

      data: variants,
    });
  } catch (err) {
    next(err);
  }
};
// export const getVendorVariantDetails = async (req, res, next) => {
//   try {
//     const { variantId } = req.params;
//     const vendorId = req.user.id;

//     const cacheKey = `vendor:variant:details:v1:${vendorId}:${variantId}`;

//     // ======================================================
//     // CACHE
//     // ======================================================

//     const cached = await RedisCache.get(cacheKey);

//     if (cached) {
//       return res.json(cached);
//     }

//     const vId = new mongoose.Types.ObjectId(vendorId);
//     const varId = new mongoose.Types.ObjectId(variantId);

//     // ======================================================
//     // VARIANT DETAILS
//     // ======================================================

//     const variantData = await Variant.aggregate([
//       // ======================================================
//       // MATCH VARIANT
//       // ======================================================

//       {
//         $match: {
//           _id: varId,
//         },
//       },

//       // ======================================================
//       // PRODUCT JOIN
//       // ======================================================

//       {
//         $lookup: {
//           from: "products",
//           localField: "productId",
//           foreignField: "_id",
//           as: "product",
//         },
//       },

//       {
//         $unwind: "$product",
//       },

//       // ======================================================
//       // VERIFY VENDOR
//       // ======================================================

//       {
//         $match: {
//           "product.vendorId": vId,
//         },
//       },

//       // ======================================================
//       // CATEGORY JOIN
//       // ======================================================

//       {
//         $lookup: {
//           from: "categories",
//           localField: "product.category",
//           foreignField: "_id",
//           as: "category",
//         },
//       },

//       {
//         $unwind: {
//           path: "$category",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // ======================================================
//       // SUB CATEGORY JOIN
//       // ======================================================

//       {
//         $lookup: {
//           from: "subcategories",
//           localField: "product.subCategory",
//           foreignField: "_id",
//           as: "subCategory",
//         },
//       },

//       {
//         $unwind: {
//           path: "$subCategory",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // ======================================================
//       // BRAND JOIN
//       // ======================================================

//       {
//         $lookup: {
//           from: "brands",
//           localField: "product.brand",
//           foreignField: "_id",
//           as: "brand",
//         },
//       },

//       {
//         $unwind: {
//           path: "$brand",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // ======================================================
//       // ALL PRODUCT VARIANTS
//       // ======================================================

//       {
//         $lookup: {
//           from: "variants",
//           let: { productId: "$product._id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$productId", "$$productId"],
//                 },
//               },
//             },

//             {
//               $project: {
//                 _id: 1,
//                 price: 1,
//                 mrp: 1,
//                 discountAmount: 1,
//                 size: 1,
//                 stock: 1,
//                 sold: 1,
//                 Type: 1,
//                 disable: 1,
//                 moq: 1,
//                 packageWeight: 1,
//                 packageDimensions: 1,
//                 createdAt: 1,
//               },
//             },

//             {
//               $sort: {
//                 _id: -1,
//               },
//             },
//           ],
//           as: "allVariants",
//         },
//       },

//       // ======================================================
//       // FINAL RESPONSE
//       // ======================================================

//       {
//         $project: {
//           _id: 1,
//           productId: 1,

//           // =========================
//           // CURRENT VARIANT
//           // =========================

//           variant: {
//             _id: "$_id",
//             price: "$price",
//             mrp: "$mrp",
//             discountAmount: "$discountAmount",
//             size: "$size",
//             stock: "$stock",
//             sold: "$sold",
//             Type: "$Type",
//             disable: "$disable",
//             moq: "$moq",
//             packageWeight: "$packageWeight",
//             packageDimensions: "$packageDimensions",
//             createdAt: "$createdAt",
//             updatedAt: "$updatedAt",
//           },

//           // =========================
//           // PRODUCT DATA
//           // =========================

//           product: {
//             _id: "$product._id",
//             name: "$product.name",
//             images: "$product.images",
//             description: "$product.description",
//             specification: "$product.specification",
//             rating: "$product.rating",
//             avgRating: "$product.avgRating",
//             productType: "$product.productType",

//             category: {
//               _id: "$category._id",
//               name: "$category.name",
//             },

//             subCategory: {
//               _id: "$subCategory._id",
//               name: "$subCategory.name",
//             },

//             brand: {
//               _id: "$brand._id",
//               name: "$brand.name",
//             },
//           },

//           // =========================
//           // ALL VARIANTS
//           // =========================

//           variants: "$allVariants",
//         },
//       },
//     ]);

//     if (!variantData.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Variant not found",
//       });
//     }

//     const response = {
//       success: true,
//       message: "Variant details fetched successfully",
//       data: variantData[0],
//     };

//     // ======================================================
//     // CACHE STORE
//     // ======================================================

//     await RedisCache.set(cacheKey, response, 300);

//     return res.json(response);
//   } catch (err) {
//     next(err);
//   }
// };

export const getVendorVariantDetails = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const vendorId = req.user.id;

    const cacheKey = `vendor:variant:details:v1:${vendorId}:${variantId}`;

    // ======================================================
    // CACHE
    // ======================================================

    const cached = await RedisCache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const vId = new mongoose.Types.ObjectId(vendorId);
    const varId = new mongoose.Types.ObjectId(variantId);

    // ======================================================
    // VARIANT DETAILS
    // ======================================================

    const variantData = await Variant.aggregate([
      // ======================================================
      // MATCH VARIANT
      // ======================================================

      {
        $match: {
          _id: varId,
        },
      },

      // ======================================================
      // PRODUCT JOIN
      // ======================================================

      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },

      {
        $unwind: "$product",
      },

      // ======================================================
      // VERIFY VENDOR
      // ======================================================

      {
        $match: {
          "product.vendorId": vId,
        },
      },

      // ======================================================
      // CATEGORY JOIN
      // ======================================================

      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ======================================================
      // SUB CATEGORY JOIN
      // ======================================================

      {
        $lookup: {
          from: "subcategories",
          localField: "product.subcategoryId",
          foreignField: "_id",
          as: "subCategory",
        },
      },

      {
        $unwind: {
          path: "$subCategory",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ======================================================
      // BRAND JOIN
      // ======================================================

      {
        $lookup: {
          from: "brands",
          localField: "product.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },

      {
        $unwind: {
          path: "$brand",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ======================================================
      // PRODUCT TYPES JOIN
      // ======================================================

      {
        $lookup: {
          from: "producttypes",
          localField: "product.productTypeId",
          foreignField: "_id",
          as: "productTypes",
        },
      },

      // ======================================================
      // ALL PRODUCT VARIANTS
      // ======================================================

      {
        $lookup: {
          from: "variants",
          let: { productId: "$product._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$productId", "$$productId"],
                },
              },
            },

            {
              $project: {
                _id: 1,
                price: 1,
                mrp: 1,
                discountAmount: 1,
                discount: 1,
                size: 1,
                stock: 1,
                sold: 1,
                Type: 1,
                disable: 1,
                moq: 1,
                packageWeight: 1,
                packageDimensions: 1,
                createdAt: 1,
              },
            },

            {
              $sort: {
                _id: -1,
              },
            },
          ],
          as: "allVariants",
        },
      },

      // ======================================================
      // FINAL RESPONSE
      // ======================================================

      {
        $project: {
          _id: 1,
          productId: 1,

          // =========================
          // CURRENT VARIANT
          // =========================

          variant: {
            _id: "$_id",

            price: "$price",

            mrp: "$mrp",

            discount: "$discount",

            discountAmount: "$discountAmount",

            size: "$size",

            stock: "$stock",

            sold: "$sold",

            Type: "$Type",

            disable: "$disable",

            moq: "$moq",

            packageWeight: "$packageWeight",

            packageDimensions: "$packageDimensions",

            createdAt: "$createdAt",

            updatedAt: "$updatedAt",
          },

          // =========================
          // PRODUCT DATA
          // =========================

          product: {
            _id: "$product._id",

            name: "$product.name",

            slug: "$product.slug",

            images: "$product.images",

            description: "$product.description",

            specification: "$product.specification",

            features: "$product.features",

            measurementUnit: "$product.measurementUnit",

            leadTime: "$product.leadTime",

            warrantyPeriod: "$product.warrantyPeriod",

            returnDays: "$product.returnDays",

            deliveryCharges: "$product.deliveryCharges",

            deliveryOptions: "$product.deliveryOptions",

            serviceableDeliveryPincode: "$product.serviceableDeliveryPincode",

            rating: "$product.rating",

            avgRating: "$product.avgRating",

            productType: "$product.productType",

            category: {
              _id: "$category._id",
              name: "$category.name",
            },

            subCategory: {
              _id: "$subCategory._id",
              name: "$subCategory.name",
            },

            brand: {
              _id: "$brand._id",
              name: "$brand.name",
              logo: "$brand.logo",
            },

            productTypes: {
              $map: {
                input: "$productTypes",
                as: "pt",
                in: {
                  _id: "$$pt._id",
                  name: "$$pt.typeName",
                },
              },
            },
          },

          // =========================
          // ALL VARIANTS
          // =========================

          variants: "$allVariants",
        },
      },
    ]);

    // ======================================================
    // NOT FOUND
    // ======================================================

    if (!variantData.length) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    const response = {
      success: true,
      message: "Variant details fetched successfully",
      data: variantData[0],
    };

    // ======================================================
    // CACHE STORE
    // ======================================================

    await RedisCache.set(cacheKey, response, 300);

    return res.json(response);
  } catch (err) {
    next(err);
  }
};
