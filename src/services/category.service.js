import Category from "../models/category/category.model.js";
import SubCategory from "../models/category/subCategory.model.js";
import Pcategory from "../models/category/pcategory.model.js";
import mongoose from "mongoose";
import { APIError } from "../middlewares/errorHandler.js";

export const create = async (data, userId) => {
  const { pcategoryId, name } = data;

  // Validate Parent exists
  const parent = await Pcategory.findById(pcategoryId);
  if (!parent) {
    throw new APIError(404, "Parent Category not found");
  }

  const existing = await Category.findOne({ pcategoryId, name });
  if (existing) {
    throw new APIError(
      400,
      "Category with this name already exists in this parent category",
    );
  }

  const category = await Category.create({
    ...data,
    createdBy: userId,
  });

  return category;
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  const { search, moduleId, pcategoryId, isActive, sort } = query;

  const matchStage = {};

  if (search) {
    matchStage.name = { $regex: search, $options: "i" };
  }

  if (moduleId) {
    matchStage.moduleId = new mongoose.Types.ObjectId(moduleId);
  }

  if (pcategoryId) {
    matchStage.pcategoryId = new mongoose.Types.ObjectId(pcategoryId);
  }

  if (isActive === "true") matchStage.isActive = true;
  if (isActive === "false") matchStage.isActive = false;

  const sortStage = {};
  if (sort) {
    const [field, order] = sort.split(":");
    sortStage[field] = order === "desc" ? -1 : 1;
  } else {
    sortStage.order = 1;
    sortStage.createdAt = -1;
  }

  const result = await Category.aggregate([
    { $match: matchStage },
    { $sort: sortStage },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const data = result[0].data;
  const total = result[0].metadata[0]?.total || 0;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getByPcategoryId = async (pcategoryId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, isActive, sort } = query;

  const matchStage = {
    pcategoryId: new mongoose.Types.ObjectId(pcategoryId), //  fixed
  };

  if (search) {
    matchStage.name = { $regex: search, $options: "i" };
  }

  if (isActive === "true") matchStage.isActive = true;
  if (isActive === "false") matchStage.isActive = false;

  const sortStage = {};
  if (sort) {
    const [field, order] = sort.split(":");
    sortStage[field] = order === "desc" ? -1 : 1;
  } else {
    sortStage.order = 1;
    sortStage.createdAt = -1;
  }

  const result = await Category.aggregate([
    { $match: matchStage },
    { $sort: sortStage },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const data = result[0].data;
  const total = result[0].metadata[0]?.total || 0;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
export const getById = async (id) => {
  const category = await Category.findById(id)
    .populate("moduleId", "title")
    .populate("pcategoryId", "name");
  if (!category) throw new APIError(404, "Category not found");
  return category;
};

export const update = async (id, data) => {
  const category = await Category.findById(id);
  if (!category) throw new APIError(404, "Category not found");

  if (data.name && data.name !== category.name) {
    const existing = await Category.findOne({
      pcategoryId: category.pcategoryId,
      name: data.name,
    });
    if (existing) {
      throw new APIError(
        400,
        "Category with this name already exists in this parent category",
      );
    }
  }

  Object.assign(category, data);
  await category.save();
  return category;
};

export const remove = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw new APIError(404, "Category not found");

  const childCount = await SubCategory.countDocuments({ categoryId: id });
  if (childCount > 0) {
    throw new APIError(
      400,
      `Cannot delete. This Category has ${childCount} related sub-categories.`,
    );
  }

  await category.deleteOne();
  return true;
};

export const toggle = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw new APIError(404, "Category not found");

  category.isActive = !category.isActive;
  await category.save();
  return category;
};

// export const getCategoryTreeService = async () => {
//   const pipeline = [
//     { $match: { isActive: true } },
//     { $sort: { order: 1 } },
//     {
//       $lookup: {
//         from: "categories",
//         localField: "_id",
//         foreignField: "pcategoryId",
//         as: "categories",
//         pipeline: [
//           { $match: { isActive: true } },
//           { $sort: { order: 1 } },
//           {
//             $lookup: {
//               from: "subcategories",
//               localField: "_id",
//               foreignField: "categoryId",
//               as: "subCategories",
//               pipeline: [
//                 { $match: { isActive: true } },
//                 { $sort: { order: 1 } },
//                 { $project: { name: 1, slug: 1, image: 1, _id: 1, order: 1 } },
//               ],
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               slug: 1,
//               image: 1,
//               subCategories: 1,
//               _id: 1,
//               order: 1,
//             },
//           },
//         ],
//       },
//     },
//     {
//       $project: {
//         name: 1,
//         slug: 1,
//         image: 1,
//         categories: 1,
//         _id: 1,
//         moduleId: 1,
//         order: 1,
//       },
//     },
//   ];

//   return await Pcategory.aggregate(pipeline);
// };

//old
// export const getCategoryTreeServiceForAdmin = async (query) => {
//   const { isActive } = query;

//   // ✅ separate filters
//   const pcategoryMatch = {};
//   const categoryMatch = {};
//   const subCategoryMatch = {};

//   if (isActive === "true") {
//     pcategoryMatch.isActive = true;
//     categoryMatch.isActive = true;
//     subCategoryMatch.isActive = true;
//   }

//   if (isActive === "false") {
//     pcategoryMatch.isActive = false;
//     categoryMatch.isActive = false;
//     subCategoryMatch.isActive = false;
//   }

//   const pipeline = [
//     { $match: pcategoryMatch },
//     { $sort: { order: 1 } },
//     {
//       $lookup: {
//         from: "categories",
//         localField: "_id",
//         foreignField: "pcategoryId",
//         as: "categories",
//         pipeline: [
//           { $match: categoryMatch }, // 👈 FIX
//           { $sort: { order: 1 } },
//           {
//             $lookup: {
//               from: "subcategories",
//               localField: "_id",
//               foreignField: "categoryId",
//               as: "subCategories",
//               pipeline: [
//                 { $match: subCategoryMatch },
//                 { $sort: { order: 1 } },
//                 {
//                   $project: {
//                     name: 1,
//                     slug: 1,
//                     image: 1,
//                     _id: 1,
//                     order: 1,
//                     isActive: 1,
//                   },
//                 },
//               ],
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               slug: 1,
//               image: 1,
//               subCategories: 1,
//               _id: 1,
//               order: 1,
//               isActive: 1,
//             },
//           },
//         ],
//       },
//     },
//     {
//       $project: {
//         name: 1,
//         slug: 1,
//         image: 1,
//         categories: 1,
//         _id: 1,
//         moduleId: 1,
//         order: 1,
//         isActive: 1,
//       },
//     },
//   ];

//   return await Pcategory.aggregate(pipeline);
// };


export const getCategoryTreeService = async (query = {}) => {
  const { search } = query;

  const pipeline = [];

  // 1. Base match
  const matchStage = {
    isActive: true,
  };

  pipeline.push({ $match: matchStage });

  // 2. Lookup categories + subcategories (same as yours)
  pipeline.push(
    {
      $sort: { order: 1 },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "pcategoryId",
        as: "categories",
        pipeline: [
          { $match: { isActive: true } },
          { $sort: { order: 1 } },
          {
            $lookup: {
              from: "subcategories",
              localField: "_id",
              foreignField: "categoryId",
              as: "subCategories",
              pipeline: [
                { $match: { isActive: true } },
                { $sort: { order: 1 } },
                {
                  $project: {
                    name: 1,
                    slug: 1,
                    image: 1,
                    _id: 1,
                    order: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              image: 1,
              subCategories: 1,
              _id: 1,
              order: 1,
            },
          },
        ],
      },
    }
  );

  // 3. SEARCH FILTER (IMPORTANT PART)
  if (search) {
    const regex = new RegExp(search, "i");

    pipeline.push({
      $match: {
        $or: [
          // parent category
          { name: regex },

          // category level
          { "categories.name": regex },

          // subcategory level (deep match)
          {
            categories: {
              $elemMatch: {
                $or: [
                  { name: regex },
                  {
                    subCategories: {
                      $elemMatch: {
                        name: regex,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    });
  }

  // 4. Final projection
  pipeline.push({
    $project: {
      name: 1,
      slug: 1,
      image: 1,
      categories: 1,
      _id: 1,
      moduleId: 1,
      order: 1,
    },
  });

  return await Pcategory.aggregate(pipeline);
};

export const getAllCategoriesService = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const categories = await Category.find({ isActive: true })
    .select("name image")
    .sort({ order: 1 })
    .skip(skip)
    .limit(limit);

  const formatted = categories.map((cat) => ({
    id: cat._id,
    categoryName: cat.name,
    img: cat.image || null,
  }));

  const finalData = [
    {
      id: "all",
      categoryName: "All",
      img: null,
    },
    ...formatted,
  ];

  return finalData;
};
// export const getCategoryTreeServiceForAdmin = async (query) => {
//   const { isActive } = query;

//   const pcategoryMatch = {};
//   const categoryMatch = {};
//   const subCategoryMatch = {};

//   if (isActive === "true") {
//     pcategoryMatch.isActive = true;
//     categoryMatch.isActive = true;
//     subCategoryMatch.isActive = true;
//   } else if (isActive === "false") {
//     pcategoryMatch.isActive = false;
//     categoryMatch.isActive = false;
//     subCategoryMatch.isActive = false;
//   }

//   const pipeline = [
//     { $match: pcategoryMatch },
//     { $sort: { order: 1 } },

//     {
//       $lookup: {
//         from: "categories",
//         localField: "_id",
//         foreignField: "pcategoryId",
//         as: "categories",
//         pipeline: [
//           { $match: categoryMatch },
//           { $sort: { order: 1 } },
//           // SubCategories
//           {
//             $lookup: {
//               from: "subcategories",
//               localField: "_id",
//               foreignField: "categoryId",
//               as: "subCategories",
//               pipeline: [
//                 { $match: subCategoryMatch },
//                 { $sort: { order: 1 } },
//                 {
//                   $project: {
//                     _id: 1,
//                     name: 1,
//                     slug: 1,
//                     image: 1,
//                     order: 1,
//                     isActive: 1,
//                     categoryId: 1,
//                   },
//                 },
//               ],
//             },
//           },

//           // 🔹 Category Projection
//           {
//             $project: {
//               _id: 1,
//               name: 1,
//               slug: 1,
//               image: 1,
//               order: 1,
//               isActive: 1,
//               pcategoryId: 1,
//               subCategories: 1,
//             },
//           },
//         ],
//       },
//     },

//     // 🔹 Parent Category Projection
//     {
//       $project: {
//         _id: 1,
//         name: 1,
//         slug: 1,
//         image: 1,
//         moduleId: 1,
//         order: 1,
//         isActive: 1,
//         categories: 1,
//       },
//     },
//   ];

//   return await Pcategory.aggregate(pipeline);
// };

export const getCategoryTreeServiceForAdmin = async (query) => {
  const { isActive } = query;

  const pcategoryMatch = {};
  const categoryMatch = {};
  const subCategoryMatch = {};
  const productTypeMatch = {};

  if (isActive === "true") {
    pcategoryMatch.isActive = true;
    categoryMatch.isActive = true;
    subCategoryMatch.isActive = true;
    productTypeMatch.status = true; // agar ProductType me status field hai
  } else if (isActive === "false") {
    pcategoryMatch.isActive = false;
    categoryMatch.isActive = false;
    subCategoryMatch.isActive = false;
    productTypeMatch.status = false;
  }

  const pipeline = [
    {
      $match: pcategoryMatch,
    },

    {
      $sort: {
        order: 1,
      },
    },

    /*
    =================================
    CATEGORY LOOKUP
    =================================
    */

    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "pcategoryId",
        as: "categories",

        pipeline: [
          {
            $match: categoryMatch,
          },

          {
            $sort: {
              order: 1,
            },
          },

          /*
          =================================
          SUBCATEGORY LOOKUP
          =================================
          */

          {
            $lookup: {
              from: "subcategories",
              localField: "_id",
              foreignField: "categoryId",
              as: "subCategories",

              pipeline: [
                {
                  $match: subCategoryMatch,
                },

                {
                  $sort: {
                    order: 1,
                  },
                },

                /*
                =================================
                PRODUCT TYPE LOOKUP
                subcategoryId ke according
                =================================
                */

                {
                  $lookup: {
                    from: "producttypes",
                    localField: "_id",
                    foreignField: "subcategoryId",
                    as: "productTypes",

                    pipeline: [
                      {
                        $match: productTypeMatch,
                      },

                      {
                        $sort: {
                          createdAt: -1,
                        },
                      },

                      {
                        $project: {
                          _id: 1,
                          typeName: 1,
                          slug: 1,
                          status: 1,
                          subcategoryId: 1,
                        },
                      },
                    ],
                  },
                },

                /*
                =================================
                SUBCATEGORY PROJECTION
                =================================
                */

                {
                  $project: {
                    _id: 1,
                    name: 1,
                    slug: 1,
                    image: 1,
                    order: 1,
                    isActive: 1,
                    categoryId: 1,

                    // NEW
                    productTypes: 1,
                  },
                },
              ],
            },
          },

          /*
          =================================
          CATEGORY PROJECTION
          =================================
          */

          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              image: 1,
              order: 1,
              isActive: 1,
              pcategoryId: 1,
              subCategories: 1,
            },
          },
        ],
      },
    },

    /*
    =================================
    PARENT CATEGORY PROJECTION
    =================================
    */

    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        image: 1,
        moduleId: 1,
        order: 1,
        isActive: 1,
        categories: 1,
      },
    },
  ];

  return await Pcategory.aggregate(pipeline);
};
