import mongoose from "mongoose";
import TrendingSection from "../models/trending/trendingSection.model.js";
import PlatformModule from "../models/platform/module.model.js";
import { sectionResolvers } from "../resolvers/sectionResolvers.js";
import { APIError } from "../middlewares/errorHandler.js";
import RedisCache from "../utils/redisCache.js";
import Product from "../models/vendorShop/product.model.js";
import variantModel from "../models/vendorShop/variant.model.js";
import pcategoryModel from "../models/category/pcategory.model.js";

export const trendingCacheKey = (slug, searchKeyword = "") =>
  `trending:${slug}:${searchKeyword || "all"}`;

export const invalidateTrending = async (moduleId) => {
  const mod = await PlatformModule.findById(moduleId).select("slug").lean();
  if (mod?.slug) {
    // Clear all variations (search keywords, etc.) for this slug
    await RedisCache.deletePattern(`trending:${mod.slug}:*`);
  }
};

// export const buildTrending = async (identifier, searchKeyword = '') => {
//     const isId = mongoose.Types.ObjectId.isValid(identifier);
//     const query = isId
//         ? { _id: identifier, isActive: true }
//         : { slug: identifier, isActive: true };

//     const module = await PlatformModule.findOne(query)
//         .select('_id title slug')
//         .lean();
//     if (!module) throw new APIError(404, `Module "${identifier}" not found`);

//     let sections = await TrendingSection.find({
//         moduleId: module._id,
//         isActive: true,
//     })
//         .sort({ order: 1 })
//         .lean();

//     if (!sections.length) return { module, sections: [] };

//     // Option 2 Implementation: If user searches, drop non-product blocks
//     if (searchKeyword && searchKeyword.trim() !== '') {
//         sections = sections.filter(sec => sec.type === 'PRODUCT_LIST');
//         // Inject search keyword into the section config for the resolver
//         sections = sections.map(sec => ({ ...sec, searchKeyword: searchKeyword.trim() }));
//     }

//     const resolvedData = await Promise.all(
//         sections.map((section) => {
//             const resolver = sectionResolvers[section.type];
//             if (!resolver) return Promise.resolve([]);
//             return resolver(section).catch((err) => {
//                 console.error(`Resolver failed for ${section.type}:`, err);
//                 return [];
//             });
//         }),
//     );

//     const result = sections.map((section, i) => ({
//         key: section.key,
//         type: section.type,
//         title: section.title,
//         order: section.order,
//         data: resolvedData[i],
//     }));

//     return { module, sections: result };
// };

// Admin CRUD for Trending Sections

// export const buildTrending = async (
//   identifier,
//   searchKeyword = "",
//   categoryId = "",
// ) => {
//   const isId = mongoose.Types.ObjectId.isValid(identifier);

//   const query = isId
//     ? { _id: identifier, isActive: true }
//     : { slug: identifier, isActive: true };

//   const module = await PlatformModule.findOne(query)
//     .select("_id title slug")
//     .lean();

//   if (!module) {
//     throw new APIError(404, `Module "${identifier}" not found`);
//   }

//   let sections = await TrendingSection.find({
//     moduleId: module._id,
//     isActive: true,
//   })
//     .sort({ order: 1 })
//     .lean();

//   if (!sections.length) {
//     return { module, sections: [] };
//   }

//   // SEARCH MODE
//   if (searchKeyword?.trim()) {
//     sections = sections
//       .filter((sec) => sec.type === "PRODUCT_LIST")
//       .map((sec) => ({
//         ...sec,
//         searchKeyword: searchKeyword.trim(),
//       }));
//   }

//   const categoryIds = new Set();

//   const resolvedSections = await Promise.all(
//     sections.map(async (section) => {
//       try {
//         let data = [];

       

//         if (section.type === "BANNER") {
//           const resolver = sectionResolvers[section.type];
//           data = resolver ? await resolver(section) : [];
//         }

//         // =========================
//         // PRODUCT SECTIONS
//         // =========================
//         else if (
//           section.type === "PRODUCT_LIST" ||
//           section.type === "HOT_DEALS" ||
//           section.type === "TOP_SELLING"
//         ) {
//           if (section.selectedProducts?.length > 0) {
//             const products = await Product.find({
//               _id: { $in: section.selectedProducts },
//               disable: false,
//               varified: true,
//               status: "ACTIVE",
//             })
//               .select(
//                 "name slug images pcategoryId avgRating reviewCount defaultVariantId",
//               )
//               .lean();

//             // =========================
//             // GET ALL VARIANTS
//             // =========================

//             const productIds = products.map((p) => p._id);

//             const allVariants = await variantModel
//               .find({
//                 productId: { $in: productIds },
//               })
//               .lean();

//             // =========================
//             // GROUP VARIANTS
//             // =========================

//             const variantMap = {};

//             allVariants.forEach((variant) => {
//               const productId = variant.productId.toString();

//               if (!variantMap[productId]) {
//                 variantMap[productId] = [];
//               }

//               const product = products.find(
//                 (p) => p._id.toString() === productId,
//               );

//               variantMap[productId].push({
//                 _id: variant._id,

//                 price: variant.price || 0,

//                 mrp: variant.mrp || 0,

//                 moq: variant.moq || 1,

//                 discount: variant.discount || 0,

//                 packageWeight: variant.packageWeight || "",

//                 Type: variant.Type || "",

//                 stock: variant.stock || 0,

//                 sold: variant.sold || 0,

//                 isDefault:
//                   variant._id.toString() ===
//                   product?.defaultVariantId?.toString(),
//               });
//             });

//             data = section.selectedProducts
//               .map((id) => {
//                 const p = products.find(
//                   (x) => x._id.toString() === id.toString(),
//                 );

//                 if (!p) return null;
//                 if (p.pcategoryId) {
//                   categoryIds.add(p.pcategoryId.toString());
//                 }
//                 return {
//                   _id: p._id,

//                   name: p.name,

//                   slug: p.slug,

//                   images: p.images,

//                   pcategoryId: p.pcategoryId || null,

//                   avgRating: p.avgRating || 0,

//                   reviewCount: p.reviewCount || 0,

//                   defaultVariantId: p.defaultVariantId || null,

//                   variants: variantMap[p._id.toString()] || [],
//                 };
//               })
//               .filter(Boolean)
//               .slice(0, section.limit);
//           }

//           // =========================
//           // AUTO FALLBACK
//           // =========================
//           else {
//             if (section.type === "HOT_DEALS") {
//               data = await Product.aggregate([
//                 {
//                   $match: {
//                     disable: false,
//                     varified: true,
//                     status: "ACTIVE",
//                   },
//                 },
//                 {
//                   $lookup: {
//                     from: "variants",
//                     localField: "defaultVariantId",
//                     foreignField: "_id",
//                     as: "variant",
//                   },
//                 },
//                 { $unwind: "$variant" },

//                 {
//                   $project: {
//                     name: 1,
//                     slug: 1,
//                     images: 1,
//                     pcategoryId: 1,
//                     avgRating: 1,
//                     reviewCount: 1,
//                     defaultVariantId: "$variant._id",

//                     price: "$variant.price",
//                     mrp: "$variant.mrp",
//                     moq: "$variant.moq",
//                     discount: "$variant.discount",
//                   },
//                 },
//                 { $sort: { discount: -1 } },
//                 { $limit: section.limit },
//               ]);
//             } else if (section.type === "TOP_SELLING") {
//               const products = await Product.find({
//                 disable: false,
//                 varified: true,
//                 status: "ACTIVE",
//               })
//                 .select(
//                   "name slug images pcategoryId avgRating reviewCount defaultVariantId soldCount viewCount",
//                 )
//                 .populate({
//                   path: "defaultVariantId",
//                   select: "price mrp discount moq",
//                 })
//                 .sort({ soldCount: -1, viewCount: -1 })
//                 .limit(section.limit)
//                 .lean();

//               // data = products.map((p) => ({
//               //   _id: p._id,
//               //   name: p.name,
//               //   slug: p.slug,
//               //   images: p.images,
//               //   pcategoryId: p.pcategoryId || null,
//               //   defaultVariantId: p.defaultVariantId?._id || null,

//               //   price: p.defaultVariantId?.price || 0,
//               //   mrp: p.defaultVariantId?.mrp || 0,
//               //   moq: p.defaultVariantId?.moq || 1,
//               //   discount: p.defaultVariantId?.discount || 0,

//               //   avgRating: p.avgRating || 0,
//               //   reviewCount: p.reviewCount || 0,
//               //   pcategoryId: p.pcategoryId || null,
//               // }));

//               data = products.map((p) => {
//                 if (p.pcategoryId) {
//                   categoryIds.add(p.pcategoryId.toString());
//                 }

//                 return {
//                   _id: p._id,
//                   name: p.name,
//                   slug: p.slug,
//                   images: p.images,
//                   pcategoryId: p.pcategoryId || null,

//                   defaultVariantId: p.defaultVariantId?._id || null,

//                   price: p.defaultVariantId?.price || 0,
//                   mrp: p.defaultVariantId?.mrp || 0,
//                   moq: p.defaultVariantId?.moq || 1,
//                   discount: p.defaultVariantId?.discount || 0,

//                   avgRating: p.avgRating || 0,
//                   reviewCount: p.reviewCount || 0,
//                 };
//               });
//             } else {
//               const products = await Product.find({
//                 disable: false,
//                 varified: true,
//                 status: "ACTIVE",
//               })
//                 .select(
//                   "name slug images pcategoryId avgRating reviewCount defaultVariantId",
//                 )
//                 .populate({
//                   path: "defaultVariantId",
//                   select: "price mrp discount moq",
//                 })
//                 .limit(section.limit)
//                 .lean();

//               data = products.map((p) => {
//                 if (p.pcategoryId) {
//                   categoryIds.add(p.pcategoryId.toString());
//                 }

//                 return {
//                   _id: p._id,
//                   name: p.name,
//                   slug: p.slug,
//                   images: p.images,

//                   pcategoryId: p.pcategoryId || null,

//                   defaultVariantId: p.defaultVariantId?._id || null,

//                   price: p.defaultVariantId?.price || 0,
//                   mrp: p.defaultVariantId?.mrp || 0,
//                   moq: p.defaultVariantId?.moq || 1,
//                   discount: p.defaultVariantId?.discount || 0,

//                   avgRating: p.avgRating || 0,
//                   reviewCount: p.reviewCount || 0,
//                 };
//               });
//             }
//           }
//         }

//         return {
//           key: section.key,
//           title: section.title,
//           type: section.type,
//           order: section.order,
//           data,
//         };
//       } catch (err) {
//         console.error(`Resolver failed for ${section.key}:`, err);

//         return {
//           key: section.key,
//           title: section.title,
//           type: section.type,
//           order: section.order,
//           data: [],
//         };
//       }
//     }),
//   );

//   const categories = categoryIds.size
//     ? await pcategoryModel
//         .find({
//           _id: { $in: [...categoryIds] },
//         })
//         .select("_id name slug image")
//         .lean()
//     : [];

//   const updatedSections = resolvedSections.map((section) => {
//     if (section.type === "CATEGORY_LIST") {
//       return {
//         ...section,
//         data: categories,
//       };
//     }

//     return section;
//   });

//  return {
//   module,
//   // categories,
//   sections: updatedSections,
// };
// };

export const buildTrending = async (
  identifier,
  searchKeyword = "",
  categoryId = "",
) => {
  const isId = mongoose.Types.ObjectId.isValid(identifier);

  const query = isId
    ? { _id: identifier, isActive: true }
    : { slug: identifier, isActive: true };

  const module = await PlatformModule.findOne(query)
    .select("_id title slug")
    .lean();

  if (!module) {
    throw new APIError(404, `Module "${identifier}" not found`);
  }

  let sections = await TrendingSection.find({
    moduleId: module._id,
    isActive: true,
  })
    .sort({ order: 1 })
    .lean();

  if (!sections.length) {
    return { module, sections: [] };
  }

  // SEARCH MODE
  if (searchKeyword?.trim()) {
    sections = sections
      .filter((sec) => sec.type === "PRODUCT_LIST")
      .map((sec) => ({
        ...sec,
        searchKeyword: searchKeyword.trim(),
      }));
  }

  // FIRST: Get ALL product category IDs from the module (without any filter)
  // This is for CATEGORY_LIST section - to show all categories that have ANY product
  const allProductCategoryIds = new Set();
  
  // Get all products from all product sections to collect category IDs
  const productSections = sections.filter(
    (sec) => sec.type === "PRODUCT_LIST" || sec.type === "HOT_DEALS" || sec.type === "TOP_SELLING"
  );
  
  for (const section of productSections) {
    if (section.selectedProducts?.length > 0) {
      // Get products without any filter to collect categories
      const products = await Product.find({
        _id: { $in: section.selectedProducts },
        disable: false,
        varified: true,
        status: "ACTIVE",
      }).select("pcategoryId").lean();
      
      products.forEach(p => {
        if (p.pcategoryId) {
          allProductCategoryIds.add(p.pcategoryId.toString());
        }
      });
    } else {
      // For dynamic sections, get all products without filter
      const products = await Product.find({
        disable: false,
        varified: true,
        status: "ACTIVE",
      }).select("pcategoryId").limit(100).lean();
      
      products.forEach(p => {
        if (p.pcategoryId) {
          allProductCategoryIds.add(p.pcategoryId.toString());
        }
      });
    }
  }

  // Build base filter for products (with category filter for product display)
  const buildProductFilter = () => {
    const filter = {
      disable: false,
      varified: true,
      status: "ACTIVE",
    };
    
    // Apply category filter ONLY for product display
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.pcategoryId = new mongoose.Types.ObjectId(categoryId);
    }
    
    // Apply search keyword if in search mode
    if (searchKeyword?.trim()) {
      filter.name = { $regex: searchKeyword.trim(), $options: "i" };
    }
    
    return filter;
  };

  // Store category IDs from filtered products (for reference)
  const filteredProductCategoryIds = new Set();

  const resolvedSections = await Promise.all(
    sections.map(async (section) => {
      try {
        let data = [];

        if (section.type === "BANNER") {
          const resolver = sectionResolvers[section.type];
          data = resolver ? await resolver(section) : [];
        }

        // =========================
        // CATEGORY LIST SECTION - Show ALL categories that have products (from allProductCategoryIds)
        // =========================
        else if (section.type === "CATEGORY_LIST") {
          // Will populate after products are processed
          data = [];
        }

        // =========================
        // PRODUCT SECTIONS
        // =========================
        else if (
          section.type === "PRODUCT_LIST" ||
          section.type === "HOT_DEALS" ||
          section.type === "TOP_SELLING"
        ) {
          if (section.selectedProducts?.length > 0) {
            const productFilter = buildProductFilter();
            productFilter._id = { $in: section.selectedProducts };
            
            const products = await Product.find(productFilter)
              .select(
                "name slug images pcategoryId avgRating reviewCount defaultVariantId",
              )
              .lean();

            const productIds = products.map((p) => p._id);

            const allVariants = await variantModel
              .find({
                productId: { $in: productIds },
              })
              .lean();

            const variantMap = {};

            allVariants.forEach((variant) => {
              const productId = variant.productId.toString();

              if (!variantMap[productId]) {
                variantMap[productId] = [];
              }

              const product = products.find(
                (p) => p._id.toString() === productId,
              );

              variantMap[productId].push({
                _id: variant._id,
                price: variant.price || 0,
                mrp: variant.mrp || 0,
                moq: variant.moq || 1,
                discount: variant.discount || 0,
                packageWeight: variant.packageWeight || "",
                Type: variant.Type || "",
                stock: variant.stock || 0,
                sold: variant.sold || 0,
                isDefault:
                  variant._id.toString() ===
                  product?.defaultVariantId?.toString(),
              });
            });

            data = section.selectedProducts
              .map((id) => {
                const p = products.find(
                  (x) => x._id.toString() === id.toString(),
                );

                if (!p) return null;
                if (p.pcategoryId) {
                  filteredProductCategoryIds.add(p.pcategoryId.toString());
                }
                return {
                  _id: p._id,
                  name: p.name,
                  slug: p.slug,
                  images: p.images,
                  pcategoryId: p.pcategoryId || null,
                  avgRating: p.avgRating || 0,
                  reviewCount: p.reviewCount || 0,
                  defaultVariantId: p.defaultVariantId || null,
                  variants: variantMap[p._id.toString()] || [],
                };
              })
              .filter(Boolean)
              .slice(0, section.limit);
          }

          else {
            const baseFilter = buildProductFilter();
            
            if (section.type === "HOT_DEALS") {
              data = await Product.aggregate([
                { $match: baseFilter },
                {
                  $lookup: {
                    from: "variants",
                    localField: "defaultVariantId",
                    foreignField: "_id",
                    as: "variant",
                  },
                },
                { $unwind: "$variant" },
                {
                  $project: {
                    name: 1,
                    slug: 1,
                    images: 1,
                    pcategoryId: 1,
                    avgRating: 1,
                    reviewCount: 1,
                    defaultVariantId: "$variant._id",
                    price: "$variant.price",
                    mrp: "$variant.mrp",
                    moq: "$variant.moq",
                    discount: "$variant.discount",
                  },
                },
                { $sort: { discount: -1 } },
                { $limit: section.limit },
              ]);
              
              data.forEach(item => {
                if (item.pcategoryId) {
                  filteredProductCategoryIds.add(item.pcategoryId.toString());
                }
              });
              
            } else if (section.type === "TOP_SELLING") {
              const products = await Product.find(baseFilter)
                .select(
                  "name slug images pcategoryId avgRating reviewCount defaultVariantId soldCount viewCount",
                )
                .populate({
                  path: "defaultVariantId",
                  select: "price mrp discount moq",
                })
                .sort({ soldCount: -1, viewCount: -1 })
                .limit(section.limit)
                .lean();

              data = products.map((p) => {
                if (p.pcategoryId) {
                  filteredProductCategoryIds.add(p.pcategoryId.toString());
                }

                return {
                  _id: p._id,
                  name: p.name,
                  slug: p.slug,
                  images: p.images,
                  pcategoryId: p.pcategoryId || null,
                  defaultVariantId: p.defaultVariantId?._id || null,
                  price: p.defaultVariantId?.price || 0,
                  mrp: p.defaultVariantId?.mrp || 0,
                  moq: p.defaultVariantId?.moq || 1,
                  discount: p.defaultVariantId?.discount || 0,
                  avgRating: p.avgRating || 0,
                  reviewCount: p.reviewCount || 0,
                };
              });
            } else {
              const products = await Product.find(baseFilter)
                .select(
                  "name slug images pcategoryId avgRating reviewCount defaultVariantId",
                )
                .populate({
                  path: "defaultVariantId",
                  select: "price mrp discount moq",
                })
                .limit(section.limit)
                .lean();

              data = products.map((p) => {
                if (p.pcategoryId) {
                  filteredProductCategoryIds.add(p.pcategoryId.toString());
                }

                return {
                  _id: p._id,
                  name: p.name,
                  slug: p.slug,
                  images: p.images,
                  pcategoryId: p.pcategoryId || null,
                  defaultVariantId: p.defaultVariantId?._id || null,
                  price: p.defaultVariantId?.price || 0,
                  mrp: p.defaultVariantId?.mrp || 0,
                  moq: p.defaultVariantId?.moq || 1,
                  discount: p.defaultVariantId?.discount || 0,
                  avgRating: p.avgRating || 0,
                  reviewCount: p.reviewCount || 0,
                };
              });
            }
          }
        }

        return {
          key: section.key,
          title: section.title,
          type: section.type,
          order: section.order,
          data,
          isCategoryList: section.type === "CATEGORY_LIST",
        };
      } catch (err) {
        console.error(`Resolver failed for ${section.key}:`, err);

        return {
          key: section.key,
          title: section.title,
          type: section.type,
          order: section.order,
          data: [],
          isCategoryList: section.type === "CATEGORY_LIST",
        };
      }
    }),
  );

  // Fetch ALL categories that have ANY products in this module (without filter)
  const allCategoriesForDisplay = allProductCategoryIds.size
    ? await pcategoryModel
        .find({
          _id: { $in: [...allProductCategoryIds] },
          isActive: true,
        })
        .select("_id name slug image")
        .sort({ name: 1 })
        .lean()
    : [];

  // Update CATEGORY_LIST sections with ALL categories (not filtered)
  const updatedSections = resolvedSections.map((section) => {
    if (section.type === "CATEGORY_LIST") {
      return {
        ...section,
        data: allCategoriesForDisplay, // Show all categories, not just filtered ones
      };
    }
    return section;
  });

  return {
    module,
    sections: updatedSections,
  };
};
export const createTrendingSection = async (data, userId) => {
  const section = await TrendingSection.create({ ...data, createdBy: userId });
  await invalidateTrending(data.moduleId);
  return section;
};

export const getAllTrendingSections = async (query) => {
  const { moduleId, isActive, page = 1, limit = 20 } = query;
  const filter = {};
  if (moduleId) filter.moduleId = moduleId;
  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [sections, total] = await Promise.all([
    TrendingSection.find(filter)
      .sort({ order: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    TrendingSection.countDocuments(filter),
  ]);
  return {
    sections,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

export const getTrendingSectionById = async (id) => {
  const section = await TrendingSection.findById(id)
    .populate({
      path: "selectedProducts",
      select: "name slug images price mrp moq discount avgRating reviewCount",
    })
    .populate({
      path: "moduleId",
      select: "name key",
    })
    .lean();

  if (!section) throw new APIError(404, "TrendingSection not found");
  console.log("Fetched Section:", section);
  return section;
};

export const updateTrendingSection = async (id, data) => {
  const section = await TrendingSection.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();
  if (!section) throw new APIError(404, "TrendingSection not found");
  await invalidateTrending(section.moduleId);
  return section;
};

export const removeTrendingSection = async (id) => {
  const section = await TrendingSection.findByIdAndDelete(id).lean();
  if (!section) throw new APIError(404, "TrendingSection not found");
  await invalidateTrending(section.moduleId);
  return section;
};

export const toggleTrendingSection = async (id) => {
  const section = await TrendingSection.findById(id);
  if (!section) throw new APIError(404, "TrendingSection not found");
  section.isActive = !section.isActive;
  await section.save({ validateBeforeSave: false });
  await invalidateTrending(section.moduleId);
  return section;
};
