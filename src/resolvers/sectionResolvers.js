import Banner from "../models/banner/banner.model.js";
import Pcategory from "../models/category/pcategory.model.js";
import Product from "../models/vendorShop/product.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";
import Brand from "../models/vendorShop/brand.model.js";
import FlashSale from "../models/flashSale/flashSale.model.js";
import FlashSaleItem from "../models/flashSale/flashSaleItem.model.js";

const applySourceFilter = (filter, section) => {
  if (section.sourceId) {
    filter._id = section.sourceId;
  }
  switch (section.sourceType) {
    case "FEATURED":
      filter.isFeatured = true;
      break;
    case "TOP_SELLING":
      filter.isTopSelling = true;
      break;
    case "FLASH":
      filter.isFlashSale = true;
      break;
    case "NEW_ARRIVALS":
      filter.createdAt = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
      break;
  }
  return filter;
};

const resolveBANNER = async (section) => {
  // Fetch banners and attach dummy variantId with mrp if needed (for frontend compatibility)
  const banners = await Banner.find(
    applySourceFilter({ moduleId: section.moduleId, isActive: true }, section),
  )
    .sort({ order: 1 })
    .limit(section.limit)
    .select("image title redirectUrl order")
    .lean();

  // If frontend expects a variantId with mrp, add it as null or default
  return banners.map((banner) => ({
    ...banner,
    // variantId: { mrp: null },
  }));
};

import Variant from "../models/vendorShop/variant.model.js";

const resolvePRODUCT_LIST = async (section) => {
  const filter = applySourceFilter(
    { moduleId: section.moduleId, disable: false },
    section,
  );

  if (section.searchKeyword) {
    filter.name = { $regex: section.searchKeyword, $options: "i" };
  }

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .limit(section.limit)
    .select(
      "_id name thumbnail slug brandId discount sold avgRating defaultVariantId",
    )
    .lean();

  // Fetch variants for all products
  const variantIds = products.map((p) => p.defaultVariantId).filter(Boolean);
  // If any product doesn't have defaultVariantId, fetch first variant for that product
  const missingVariantProducts = products.filter((p) => !p.defaultVariantId);
  let missingVariants = [];
  if (missingVariantProducts.length > 0) {
    const ids = missingVariantProducts.map((p) => p._id);
    // Get first variant for each product without defaultVariantId
    missingVariants = await Variant.aggregate([
      { $match: { productId: { $in: ids } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$productId",
          variant: { $first: "$$ROOT" },
        },
      },
    ]);
  }

  let variants = [];
  if (variantIds.length > 0) {
    variants = await Variant.find({ _id: { $in: variantIds } }).lean();
  }

  // Map for quick lookup
  const variantMap = {};
  variants.forEach((v) => {
    if (v) variantMap[v._id?.toString()] = v;
  });
  missingVariants.forEach((vg) => {
    if (vg.variant) variantMap[vg.variant._id?.toString()] = vg.variant;
  });

  // Attach variantId field
  const result = products.map((product) => {
    let variant = null;
    if (
      product.defaultVariantId &&
      variantMap[product.defaultVariantId.toString()]
    ) {
      variant = variantMap[product.defaultVariantId.toString()];
    } else {
      // Find by productId
      const found = Object.values(variantMap).find(
        (v) => v.productId?.toString() === product._id.toString(),
      );
      if (found) variant = found;
    }
    // Only pick required fields for variantId
    let variantId = null;
    if (variant) {
      variantId = {
        _id: variant._id,
        price: variant.price,
        mrp: variant.mrp,
        stock: variant.stock,
        Type: variant.Type,
        moq: variant.moq,
        packageWeight: variant.packageWeight,
        packageDimensions: variant.packageDimensions,
      };
    }
    return {
      ...product,
      variantId,
    };
  });

  return result;
};

const resolveCATEGORY_LIST = async (section) => {
  return Pcategory.find(
    applySourceFilter({ moduleId: section.moduleId, isActive: true }, section),
  )
    .sort({ order: 1 })
    .limit(section.limit)
    .select("name image slug")
    .lean();
};

//pradeep-code
// const resolveVENDOR_LIST = async (section) => {
//     return VendorProfile.find(
//         applySourceFilter({ moduleId: section.moduleId, disable: false, isAdminVerified: true }, section)
//     )
//         .sort({ createdAt: -1 })
//         .limit(section.limit)
//         .select('firstName lastName email isProfileCompleted isAdminVerified createdAt')
//         .lean();
// };

//asgar-code
const resolveVENDOR_LIST = async (section) => {
  return VendorProfile.aggregate([
    {
      $match: applySourceFilter(
        { disable: false, isAdminVerified: true },
        section,
      ),
    },

    { $sort: { createdAt: -1 } },
    { $limit: section.limit },

    {
      $lookup: {
        from: "vendorcompanies",
        localField: "_id",
        foreignField: "vendorId",
        as: "company",
      },
    },

    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: false, // sirf wahi vendors jinke paas company hai
      },
    },

    {
      $project: {
        _id: 1,

        // vendor basic
        firstName: 1,
        lastName: 1,

        // shop info (frontend me ye hi use hoga)
        shopName: "$company.companyName",
        shopImage: { $arrayElemAt: ["$company.shopImages", 0] },
        city: "$company.businessAddress.city",
        isOpen: "$company.isOpen",
        badges: "$company.badges",
      },
    },
  ]);
};
const resolveBRAND_LIST = async (section) => {
  return Brand.find(
    applySourceFilter(
      { moduleId: section.moduleId, status: "active" },
      section,
    ),
  )
    .sort({ order: 1 })
    .limit(section.limit)
    .select("name logo slug")
    .lean();
};

// const resolveFLASH_SALE = async (section) => {
//   const now = new Date();

//   const activeSale = await FlashSale.findOne({
//     moduleId: section.moduleId,
//     isCancelled: false,
//     startDateTime: { $lte: now },
//     endDateTime: { $gte: now },
//   })
//     .select("_id label startDateTime endDateTime")
//     .lean();

//   if (!activeSale) return [];

//   const items = await FlashSaleItem.find({ flashSaleId: activeSale._id })
//     .limit(section.limit)
//     .populate("productId", "name thumbnail images slug avgRating")
//     .populate("variantId")
//     .lean();

//   // Prepare variantId map for all variants in this flash sale
//   const variantIds = items
//     .map((item) => item.variantId?._id || item.variantId)
//     .filter(Boolean);
//   let variants = [];
//   if (variantIds.length > 0) {
//     variants = await Variant.find({ _id: { $in: variantIds } }).lean();
//   }
//   const variantMap = {};
//   variants.forEach((v) => {
//     if (v) variantMap[v._id?.toString()] = v;
//   });

//   const enriched = items
//     .filter((item) => item.productId && item.variantId)
//     .map((item) => {
//       // Find full variant info
//       let variant =
//         item.variantId && item.variantId._id
//           ? item.variantId
//           : variantMap[item.variantId?.toString()];
//       let variantId = null;
//       if (variant) {
//         variantId = {
//           _id: variant._id,
//           price: variant.price,
//           mrp: variant.mrp,
//           discount: variant.discount,
//           discountAmount: variant.discountAmount,
//           stock: variant.stock,
//           Type: variant.Type,
//           moq: variant.moq,
//           packageWeight: variant.packageWeight,
//           packageDimensions: variant.packageDimensions,
//         };
//       }
//       return {
//         flashItemId: item._id,
//         product: {
//           ...item.productId,
//           defaultVariantId:
//             item.productId?.defaultVariantId ||
//             (variant ? variant._id : undefined),
//         },
//         variant: {
//           _id: variant?._id,
//           mrp: variant?.mrp,
//           size: variant?.size,
//           Type: variant?.Type,
//           defaultVariantId:
//             item.productId?.defaultVariantId ||
//             (variant ? variant._id : undefined),
//           variantId: variantId,
//         },
//         originalPrice: item.basePriceSnapshot,
//         flashPrice: item.flashPrice,
//         discountPercent: item.flashDiscountPercent,
//         discountAmount: item.basePriceSnapshot - item.flashPrice,
//         remainingStock: Math.max(item.allocatedStock - item.sold, 0),
//         soldPercent: Math.max(
//           0,
//           Math.min(100, Math.round((item.sold / item.allocatedStock) * 100)),
//         ),
//       };
//     });

//   return [
//     {
//       saleId: activeSale._id,
//       saleLabel: activeSale.label,
//       endsAt: activeSale.endDateTime,
//       startsAt: activeSale.startDateTime,
//       items: enriched,
//     },
//   ];
// };

const resolveFLASH_SALE = async (section) => {
  const now = new Date();

  const activeSale = await FlashSale.findOne({
    moduleId: section.moduleId,
    isCancelled: false,
    startDateTime: { $lte: now },
    endDateTime: { $gte: now },
  })
    .select("_id label startDateTime endDateTime")
    .lean();

  if (!activeSale) return [];

  const items = await FlashSaleItem.find({ flashSaleId: activeSale._id })
    .limit(section.limit)
    .populate("productId", "name thumbnail images slug avgRating")
    .populate("variantId")
    .lean();

  // Collect variant IDs
  const variantIds = items
    .map((item) => item.variantId?._id || item.variantId)
    .filter(Boolean);

  let variants = [];
  if (variantIds.length > 0) {
    variants = await Variant.find({ _id: { $in: variantIds } }).lean();
  }

  // Create variant map
  const variantMap = {};
  variants.forEach((v) => {
    if (v) variantMap[v._id.toString()] = v;
  });

  const enriched = items
    .filter((item) => item.productId && item.variantId)
    .map((item) => {
      const variant =
        item.variantId && item.variantId._id
          ? item.variantId
          : variantMap[item.variantId?.toString()];

      return {
        flashItemId: item._id,

        product: {
          ...item.productId,
          //   defaultVariantId: item.productId?.defaultVariantId || variant?._id,
        },

        variant: variant
          ? {
              _id: variant._id,
              price: variant.price,
              mrp: variant.mrp,
              discount: variant.discount,
              discountAmount: variant.discountAmount,
              stock: variant.stock,
              Type: variant.Type,
              moq: variant.moq,
              packageWeight: variant.packageWeight,
              packageDimensions: variant.packageDimensions,
            }
          : null,

        originalPrice: item.basePriceSnapshot,
        flashPrice: item.flashPrice,
        discountPercent: item.flashDiscountPercent,
        discountAmount: item.basePriceSnapshot - item.flashPrice,

        remainingStock: Math.max(item.allocatedStock - item.sold, 0),

        soldPercent: Math.max(
          0,
          Math.min(100, Math.round((item.sold / item.allocatedStock) * 100)),
        ),
      };
    });

  return [
    {
      saleId: activeSale._id,
      saleLabel: activeSale.label,
      startsAt: activeSale.startDateTime,
      endsAt: activeSale.endDateTime,
      items: enriched,
    },
  ];
};

export const sectionResolvers = {
  BANNER: resolveBANNER,
  PRODUCT_LIST: resolvePRODUCT_LIST,
  CATEGORY_LIST: resolveCATEGORY_LIST,
  VENDOR_LIST: resolveVENDOR_LIST,
  BRAND_LIST: resolveBRAND_LIST,
  FLASH_SALE: resolveFLASH_SALE,
};
