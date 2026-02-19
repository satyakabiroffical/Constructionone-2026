import Category from '../models/category/category.model.js';
import { APIError } from '../middlewares/errorHandler.js';

/**
 * Create a new category
 */
export const createCategoryService = async (categoryData) => {
    const { title, type, parentId, createdBy, image, brandId, order } = categoryData;

    // Validate parent existence for CATEGORY and SUBCATEGORY
    if (type === 'CATEGORY' || type === 'SUBCATEGORY') {
        if (!parentId) {
            throw new APIError(400, `${type} requires a parentId`);
        }

        const parent = await Category.findById(parentId);
        if (!parent) {
            throw new APIError(404, 'Parent category not found');
        }

        // Validate parent type
        if (type === 'CATEGORY' && parent.type !== 'MAIN') {
            throw new APIError(400, 'CATEGORY must have a MAIN category as parent');
        }
        if (type === 'SUBCATEGORY' && parent.type !== 'CATEGORY') {
            throw new APIError(400, 'SUBCATEGORY must have a CATEGORY as parent');
        }
    }

    // Check for duplicate title at same level
    const duplicateQuery = { title, type };
    if (parentId) {
        duplicateQuery.parentId = parentId;
    } else {
        duplicateQuery.parentId = null;
    }

    const existingCategory = await Category.findOne(duplicateQuery);
    if (existingCategory) {
        throw new APIError(400, `Category with title "${title}" already exists at this level`);
    }

    // Create category
    const category = new Category({
        title,
        type,
        parentId: parentId || null,
        image,
        brandId,
        order: order || 0,
        createdBy,
        isActive: true,
    });

    await category.save();
    return category;
};

/**
 * Get categories with pagination, search, and filtering
 */
export const getCategoriesService = async (filters = {}) => {
    const {
        type,
        parentId,
        search,
        isActive,
        page = 1,
        limit = 10,
        sortBy = 'order',
        sortOrder = 'asc',
    } = filters;

    const query = {};

    if (type) query.type = type;

    // Convert string parentId to ObjectId for proper MongoDB matching
    if (parentId !== undefined && parentId !== null && parentId !== '') {
        const mongoose = await import('mongoose');
        query.parentId = new mongoose.default.Types.ObjectId(parentId);
    }

    if (isActive !== undefined) query.isActive = isActive;
    if (search) {
        query.title = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const pipeline = [
        { $match: query },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [
                    { $sort: sort },
                    { $skip: skip },
                    { $limit: parseInt(limit) },
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'parentId',
                            foreignField: '_id',
                            as: 'parent',
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'createdBy',
                            foreignField: '_id',
                            as: 'creator',
                        },
                    },
                    {
                        $addFields: {
                            parent: { $arrayElemAt: ['$parent', 0] },
                            creator: { $arrayElemAt: ['$creator', 0] },
                        },
                    },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            image: 1,
                            type: 1,
                            parentId: 1,
                            brandId: 1,
                            order: 1,
                            isActive: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            'parent.title': 1,
                            'parent.slug': 1,
                            'creator.name': 1,
                            'creator.email': 1,
                        },
                    },
                ],
            },
        },
    ];

    const result = await Category.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    return {
        data,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single category by ID
 */
export const getCategoryByIdService = async (categoryId) => {
    const category = await Category.findById(categoryId)
        .populate('parentId', 'title slug type')
        .populate('createdBy', 'name email');

    if (!category) {
        throw new APIError(404, 'Category not found');
    }

    return category;
};

/**
 * Update category
 */
export const updateCategoryService = async (categoryId, updateData) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        throw new APIError(404, 'Category not found');
    }

    // If parentId is being changed, validate
    if (updateData.parentId && updateData.parentId !== category.parentId?.toString()) {
        const parent = await Category.findById(updateData.parentId);
        if (!parent) {
            throw new APIError(404, 'Parent category not found');
        }

        // Validate parent type based on current type
        if (category.type === 'CATEGORY' && parent.type !== 'MAIN') {
            throw new APIError(400, 'CATEGORY must have a MAIN category as parent');
        }
        if (category.type === 'SUBCATEGORY' && parent.type !== 'CATEGORY') {
            throw new APIError(400, 'SUBCATEGORY must have a CATEGORY as parent');
        }
    }

    // Check for duplicate title if title is being changed
    if (updateData.title && updateData.title !== category.title) {
        const duplicateQuery = {
            title: updateData.title,
            type: category.type,
            _id: { $ne: categoryId },
        };

        if (category.parentId) {
            duplicateQuery.parentId = category.parentId;
        } else {
            duplicateQuery.parentId = null;
        }

        const duplicate = await Category.findOne(duplicateQuery);
        if (duplicate) {
            throw new APIError(400, `Category with title "${updateData.title}" already exists at this level`);
        }
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
        if (key !== 'type' && key !== 'createdBy') {
            category[key] = updateData[key];
        }
    });

    await category.save();
    return category;
};

/**
 * Toggle category status
 */
export const toggleCategoryStatusService = async (categoryId) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        throw new APIError(404, 'Category not found');
    }

    category.isActive = !category.isActive;
    await category.save();

    return category;
};

/**
 * Delete category (prevent if has children)
 */
export const deleteCategoryService = async (categoryId) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        throw new APIError(404, 'Category not found');
    }

    // Check for children
    const childrenCount = await Category.countDocuments({ parentId: categoryId });
    if (childrenCount > 0) {
        throw new APIError(400, `Cannot delete category. It has ${childrenCount} child categories.`);
    }

    await Category.findByIdAndDelete(categoryId);

    return { message: 'Category deleted successfully' };
};

/**
 * Get hierarchical category tree (for marketplace)
 */
export const getCategoryTreeService = async () => {
    const categories = await Category.aggregate([
        { $match: { isActive: true } },
        { $sort: { order: 1, title: 1 } },
        {
            $group: {
                _id: '$type',
                items: { $push: '$$ROOT' },
            },
        },
    ]);

    const categoryMap = {};
    categories.forEach((group) => {
        categoryMap[group._id] = group.items;
    });

    const mainCategories = categoryMap.MAIN || [];
    const categoryItems = categoryMap.CATEGORY || [];
    const subCategoryItems = categoryMap.SUBCATEGORY || [];

    // Build tree structure
    const tree = mainCategories.map((main) => {
        const children = categoryItems
            .filter((cat) => cat.parentId?.toString() === main._id.toString())
            .map((cat) => {
                const subChildren = subCategoryItems
                    .filter((sub) => sub.parentId?.toString() === cat._id.toString())
                    .map((sub) => ({
                        _id: sub._id,
                        title: sub.title,
                        slug: sub.slug,
                        image: sub.image,
                        order: sub.order,
                        type: sub.type,
                    }));

                return {
                    _id: cat._id,
                    title: cat.title,
                    slug: cat.slug,
                    image: cat.image,
                    order: cat.order,
                    type: cat.type,
                    subCategories: subChildren,
                };
            });

        return {
            _id: main._id,
            title: main.title,
            slug: main.slug,
            image: main.image,
            order: main.order,
            type: main.type,
            categories: children,
        };
    });

    return tree;
};
