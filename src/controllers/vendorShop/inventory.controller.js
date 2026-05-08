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
