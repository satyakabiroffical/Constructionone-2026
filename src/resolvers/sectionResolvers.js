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
    variantId: { mrp: null },
  }));
};

import Variant from "../models/vendorShop/variant.model.js";

// const resolvePRODUCT_LIST = async (section) => {
//   let products = [];

//   // =====================================
//   // ADMIN SELECTED PRODUCTS
//   // =====================================
//   if (section.selectedProducts?.length > 0) {
//     const filter = applySourceFilter(
//       {
//         _id: { $in: section.selectedProducts },
//         disable: false,
//         varified: true,
//       },
//       section,
//     );

//     if (section.searchKeyword) {
//       filter.name = {
//         $regex: section.searchKeyword,
//         $options: "i",
//       };
//     }

//     products = await Product.find(filter)
//       .select(
//         "_id varified name thumbnail images slug brandId discount sold avgRating defaultVariantId measurementUnit",
//       )
//       .lean();

//     // Maintain admin selected order
//     products.sort((a, b) => {
//       return (
//         section.selectedProducts.findIndex(
//           (id) => id.toString() === a._id.toString(),
//         ) -
//         section.selectedProducts.findIndex(
//           (id) => id.toString() === b._id.toString(),
//         )
//       );
//     });
//   }

//   // =====================================
//   // DEFAULT LATEST PRODUCTS
//   // =====================================
//   else {
//     const filter = applySourceFilter(
//       {
//         moduleId: section.moduleId,
//         disable: false,
//         varified: true,
//       },
//       section,
//     );

//     if (section.searchKeyword) {
//       filter.name = {
//         $regex: section.searchKeyword,
//         $options: "i",
//       };
//     }

//     products = await Product.find(filter)
//       .sort({ createdAt: -1 }) // latest products
//       .limit(section.limit)
//       .select(
//         "_id varified name thumbnail images slug brandId discount sold avgRating defaultVariantId measurementUnit",
//       )
//       .lean();
//   }

//   // =====================================
//   // VARIANTS
//   // =====================================

//   const variantIds = products.map((p) => p.defaultVariantId).filter(Boolean);

//   const missingVariantProducts = products.filter((p) => !p.defaultVariantId);

//   let missingVariants = [];

//   if (missingVariantProducts.length > 0) {
//     const ids = missingVariantProducts.map((p) => p._id);

//     missingVariants = await Variant.aggregate([
//       { $match: { productId: { $in: ids } } },
//       { $sort: { createdAt: 1 } },
//       {
//         $group: {
//           _id: "$productId",
//           variant: { $first: "$$ROOT" },
//         },
//       },
//     ]);
//   }

//   let variants = [];

//   if (variantIds.length > 0) {
//     variants = await Variant.find({
//       _id: { $in: variantIds },
//     }).lean();
//   }

//   const variantMap = {};

//   variants.forEach((v) => {
//     if (v) {
//       variantMap[v._id?.toString()] = v;
//     }
//   });

//   missingVariants.forEach((vg) => {
//     if (vg.variant) {
//       variantMap[vg.variant._id?.toString()] = vg.variant;
//     }
//   });

//   // =====================================
//   // FINAL RESPONSE
//   // =====================================

//   const result = products.map((product) => {
//     let variant = null;

//     if (
//       product.defaultVariantId &&
//       variantMap[product.defaultVariantId.toString()]
//     ) {
//       variant = variantMap[product.defaultVariantId.toString()];
//     } else {
//       const found = Object.values(variantMap).find(
//         (v) => v.productId?.toString() === product._id.toString(),
//       );

//       if (found) variant = found;
//     }

//     let variantId = null;

//     if (variant) {
//       variantId = {
//         _id: variant._id,
//         price: variant.price,
//         mrp: variant.mrp,
//         stock: variant.stock,
//         Type: variant.Type,
//         moq: variant.moq,
//         packageWeight: variant.packageWeight,
//         packageDimensions: variant.packageDimensions,
//       };
//     }

//     return {
//       ...product,
//       variantId,
//     };
//   });

//   return result;
// };

const resolvePRODUCT_LIST = async (section) => {
  let products = [];

  // =====================================
  // ADMIN SELECTED PRODUCTS
  // =====================================
  if (section.selectedProducts?.length > 0) {
    const filter = applySourceFilter(
      {
        _id: { $in: section.selectedProducts },
        disable: false,
        varified: true,
      },
      section,
    );

    if (section.searchKeyword) {
      filter.name = {
        $regex: section.searchKeyword,
        $options: "i",
      };
    }

    products = await Product.find(filter)
      .select(
        "_id varified name thumbnail images slug brandId discount sold avgRating defaultVariantId measurementUnit",
      )
      .lean();

    // Maintain admin selected order
    products.sort((a, b) => {
      return (
        section.selectedProducts.findIndex(
          (id) => id.toString() === a._id.toString(),
        ) -
        section.selectedProducts.findIndex(
          (id) => id.toString() === b._id.toString(),
        )
      );
    });
  }

  // =====================================
  // DEFAULT LATEST PRODUCTS
  // =====================================
  else {
    const filter = applySourceFilter(
      {
        moduleId: section.moduleId,
        disable: false,
        varified: true,
      },
      section,
    );

    if (section.searchKeyword) {
      filter.name = {
        $regex: section.searchKeyword,
        $options: "i",
      };
    }

    products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(section.limit)
      .select(
        "_id varified name thumbnail images slug brandId discount sold avgRating defaultVariantId measurementUnit",
      )
      .lean();
  }

  // =====================================
  // GET ALL VARIANTS
  // =====================================

  const productIds = products.map((p) => p._id);

  const variants = await Variant.find({
    productId: { $in: productIds },
  }).lean();

  // =====================================
  // GROUP VARIANTS BY PRODUCT
  // =====================================

  const variantMap = {};

  variants.forEach((variant) => {
    const productId = variant.productId.toString();

    if (!variantMap[productId]) {
      variantMap[productId] = [];
    }

    variantMap[productId].push({
      _id: variant._id,
      price: variant.price,
      mrp: variant.mrp,
      stock: variant.stock,
      Type: variant.Type,
      moq: variant.moq,
      discount: variant.discount,
      discountAmount: variant.discountAmount,
      color: variant.color || "",
      packageWeight: variant.packageWeight,
      packageDimensions: variant.packageDimensions,
      isDefault:
        variant._id.toString() ===
        products
          .find((p) => p._id.toString() === productId)
          ?.defaultVariantId?.toString(),
    });
  });

  // =====================================
  // FINAL RESPONSE
  // =====================================

  const result = products.map((product) => {
    return {
      ...product,
      variants: variantMap[product._id.toString()] || [],
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
    .select("name logo slug bgColor")
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
//     .populate({
//       path: "productId",
//       select: "name thumbnail images slug avgRating vendorId",
//     })
//     .populate("variantId")
//     .lean();

//   // Collect all vendorIds and productIds
//   const productVendorMap = {};
//   const vendorIds = new Set();
//   items.forEach((item) => {
//     if (item.productId && item.productId.vendorId) {
//       productVendorMap[item.productId._id.toString()] =
//         item.productId.vendorId.toString();
//       vendorIds.add(item.productId.vendorId.toString());
//     }
//   });

//   // Fetch vendor profiles
//   const vendors = await VendorProfile.find({
//     _id: { $in: Array.from(vendorIds) },
//   })
//     .select("_id firstName lastName")
//     .lean();
//   const vendorProfileMap = {};
//   vendors.forEach((v) => {
//     vendorProfileMap[v._id.toString()] = v;
//   });

//   // Fetch vendor companies
//   const vendorCompanies = await (
//     await import("../models/vendorShop/vendor.model.js")
//   ).VendorCompany.find({ vendorId: { $in: Array.from(vendorIds) } })
//     .select("vendorId companyName")
//     .lean();
//   const vendorCompanyMap = {};
//   vendorCompanies.forEach((c) => {
//     vendorCompanyMap[c.vendorId.toString()] = c.companyName;
//   });

//   // Collect variant IDs
//   const variantIds = items
//     .map((item) => item.variantId?._id || item.variantId)
//     .filter(Boolean);

//   let variants = [];
//   if (variantIds.length > 0) {
//     variants = await Variant.find({ _id: { $in: variantIds } }).lean();
//   }

//   // Create variant map
//   const variantMap = {};
//   variants.forEach((v) => {
//     if (v) variantMap[v._id.toString()] = v;
//   });

//   const enriched = items
//     .filter((item) => item.productId && item.variantId)
//     .map((item) => {
//       const variant =
//         item.variantId && item.variantId._id
//           ? item.variantId
//           : variantMap[item.variantId?.toString()];

//       // Vendor info
//       let vendorName = null;
//       let companyName = null;
//       if (item.productId && item.productId.vendorId) {
//         const vId = item.productId.vendorId.toString();
//         const profile = vendorProfileMap[vId];
//         vendorName = profile
//           ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
//           : null;
//         companyName = vendorCompanyMap[vId] || null;
//       }

//       return {
//         flashItemId: item._id,

//         product: {
//           ...item.productId,
//           vendorName,
//           companyName,
//         },

//         variant: variant
//           ? {
//               _id: variant._id,
//               price: variant.price,
//               mrp: variant.mrp,
//               discount: variant.discount,
//               discountAmount: variant.discountAmount,
//               stock: variant.stock,
//               Type: variant.Type,
//               moq: variant.moq,
//               packageWeight: variant.packageWeight,
//               packageDimensions: variant.packageDimensions,
//             }
//           : null,

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
//       startsAt: activeSale.startDateTime,
//       endsAt: activeSale.endDateTime,
//       items: enriched,
//     },
//   ];
// };

import { VendorCompany } from "../models/vendorShop/vendor.model.js";

// const resolveFLASH_SALE = async (section) => {
//   const now = new Date();

//   // =========================
//   // GET ALL VALID SALES
//   // =========================
//   const activeSales = await FlashSale.find({
//     moduleId: section.moduleId,
//     isCancelled: false,
//     endDateTime: { $gte: now },
//   })
//     .sort({ startDateTime: 1 })
//     .lean();

//   if (!activeSales.length) return [];

//   // =========================
//   // PICK ACTIVE SALE (LIKE OLD LOGIC)
//   // =========================
//   let activeSale = activeSales.find((sale) => {
//     return (
//       new Date(sale.startDateTime) <= now && new Date(sale.endDateTime) >= now
//     );
//   });

//   // fallback → UPCOMING (OLD BEHAVIOR SAFE)
//   if (!activeSale) {
//     activeSale = activeSales[0];
//   }

//   if (!activeSale) return [];

//   const isUpcoming = now < new Date(activeSale.startDateTime);
//   const isExpired = now > new Date(activeSale.endDateTime);

//   const isFlashActive = !activeSale.isCancelled && !isUpcoming && !isExpired;

//   const isClickable = isFlashActive;

//   // =========================
//   // GET ITEMS (SAME OLD STYLE)
//   // =========================

//   const result = await Promise.all(
//     activeSales.map(async (sale) => {
//       const isUpcoming = now < new Date(sale.startDateTime);
//       const isExpired = now > new Date(sale.endDateTime);

//       const isFlashActive = !sale.isCancelled && !isUpcoming && !isExpired;

//       const items = await FlashSaleItem.find({
//         flashSaleId: sale._id,
//       })
//         .populate("productId")
//         .populate("variantId")
//         .lean();

//       const enriched = items.map((item) => ({
//         flashItemId: item._id,

//         product: {
//           _id: item.productId?._id,
//           name: item.productId?.name,
//           images: item.productId?.images || [],
//           thumbnail: item.productId?.thumbnail || [],
//           measurmentUnit: item.productId?.measurementUnit || null,
//           slug: item.productId?.slug,
//           vendorId: item.productId?.vendorId,
//         },

//         variant: item.variantId,

//         originalPrice: item.basePriceSnapshot,
//         flashPrice: item.flashPrice,

//         finalPrice: isFlashActive ? item.flashPrice : item.variantId?.price,

//         discountPercent: item.flashDiscountPercent,
//         remainingStock: (item.allocatedStock || 0) - (item.sold || 0),

//         soldPercent: item.allocatedStock
//           ? Math.round(((item.sold || 0) / item.allocatedStock) * 100)
//           : 0,

//         saleId: sale._id,
//         saleLabel: sale.label,
//         startsAt: sale.startDateTime,
//         endsAt: sale.endDateTime,

//         isUpcoming,
//         isFlashActive,
//         isClickable: isFlashActive,
//       }));

//       return {
//         saleId: sale._id,
//         saleLabel: sale.label,
//         startsAt: sale.startDateTime,
//         endsAt: sale.endDateTime,
//         items: enriched,
//       };
//     }),
//   );

//   return result;
// };

const resolveFLASH_SALE = async (section) => {
  const now = new Date();

  // =========================
  // GET ALL VALID SALES
  // =========================
  const activeSales = await FlashSale.find({
    moduleId: section.moduleId,
    isCancelled: false,
    endDateTime: { $gte: now },
  })
    .sort({ startDateTime: 1 })
    .lean();

  if (!activeSales.length) return [];

  // =========================
  // PICK ACTIVE SALE
  // =========================
  let activeSale = activeSales.find((sale) => {
    return (
      new Date(sale.startDateTime) <= now && new Date(sale.endDateTime) >= now
    );
  });

  if (!activeSale) {
    activeSale = activeSales[0];
  }

  if (!activeSale) return [];

  // =========================
  // GET ALL ITEMS
  // =========================
  const result = await Promise.all(
    activeSales.map(async (sale) => {
      const isUpcoming = now < new Date(sale.startDateTime);
      const isExpired = now > new Date(sale.endDateTime);

      const isFlashActive = !sale.isCancelled && !isUpcoming && !isExpired;

      const items = await FlashSaleItem.find({
        flashSaleId: sale._id,
      })
        .populate({
          path: "productId",
          populate: {
            path: "vendorId",
            model: "vendorProfile",
            select: "firstName lastName",
          },
        })
        .populate("variantId")
        .lean();

      // =========================
      // COLLECT VENDOR IDS
      // =========================
      const vendorIds = [
        ...new Set(
          items.map((i) => i.productId?.vendorId?._id).filter(Boolean),
        ),
      ];

      // =========================
      // FETCH COMPANY DATA
      // =========================
      const companies = await VendorCompany.find(
        { vendorId: { $in: vendorIds } },
        { companyName: 1, vendorId: 1 },
      ).lean();

      const companyMap = new Map(
        companies.map((c) => [c.vendorId.toString(), c]),
      );

      // =========================
      // ENRICH ITEMS
      // =========================
      const enriched = items.map((item) => {
        const vendor = item.productId?.vendorId;
        const company = companyMap.get(vendor?._id?.toString());

        const isUpcomingItem = now < new Date(sale.startDateTime);
        const isExpiredItem = now > new Date(sale.endDateTime);

        const isFlashActiveItem =
          !sale.isCancelled && !isUpcomingItem && !isExpiredItem;

        return {
          flashItemId: item._id,

          product: {
            _id: item.productId?._id,
            name: item.productId?.name,
            images: item.productId?.images || [],
            thumbnail: item.productId?.thumbnail || [],
            measurmentUnit: item.productId?.measurementUnit || null,
            slug: item.productId?.slug,

            vendor: {
              _id: vendor?._id,
              firstName: vendor?.firstName || null,
              lastName: vendor?.lastName || null,
              companyName: company?.companyName || null,
            },
          },

          variant: item.variantId,

          originalPrice: item.basePriceSnapshot,
          flashPrice: item.flashPrice,

          finalPrice: isFlashActiveItem
            ? item.flashPrice
            : item.variantId?.price,

          discountPercent: item.flashDiscountPercent,

          remainingStock: (item.allocatedStock || 0) - (item.sold || 0),

          soldPercent: item.allocatedStock
            ? Math.round(((item.sold || 0) / item.allocatedStock) * 100)
            : 0,

          saleId: sale._id,
          saleLabel: sale.label,
          startsAt: sale.startDateTime,
          endsAt: sale.endDateTime,

          isUpcoming: isUpcomingItem,
          isFlashActive: isFlashActiveItem,
          isClickable: isFlashActiveItem,
        };
      });

      return {
        saleId: sale._id,
        saleLabel: sale.label,
        startsAt: sale.startDateTime,
        endsAt: sale.endDateTime,
        items: enriched,
      };
    }),
  );

  return result;
};

export const sectionResolvers = {
  BANNER: resolveBANNER,
  PRODUCT_LIST: resolvePRODUCT_LIST,
  CATEGORY_LIST: resolveCATEGORY_LIST,
  VENDOR_LIST: resolveVENDOR_LIST,
  BRAND_LIST: resolveBRAND_LIST,
  FLASH_SALE: resolveFLASH_SALE,
};
