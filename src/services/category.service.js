import Category from '../models/category/category.model.js';
import SubCategory from '../models/category/subCategory.model.js';
import Pcategory from '../models/category/pcategory.model.js';
import mongoose from 'mongoose';
import { APIError } from '../middlewares/errorHandler.js';

export const create = async (data, userId) => {
    const { moduleId, pcategoryId, name } = data;

    // Validate Parent exists
    const parent = await Pcategory.findById(pcategoryId);
    if (!parent) {
        throw new APIError(404, 'Parent Category not found');
    }

    const existing = await Category.findOne({ pcategoryId, name });
    if (existing) {
        throw new APIError(400, 'Category with this name already exists in this parent category');
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
        matchStage.name = { $regex: search, $options: 'i' };
    }

    if (moduleId) {
        matchStage.moduleId = new mongoose.Types.ObjectId(moduleId);
    }

    if (pcategoryId) {
        matchStage.pcategoryId = new mongoose.Types.ObjectId(pcategoryId);
    }

    if (isActive === 'true') matchStage.isActive = true;
    if (isActive === 'false') matchStage.isActive = false;

    const sortStage = {};
    if (sort) {
        const [field, order] = sort.split(':');
        sortStage[field] = order === 'desc' ? -1 : 1;
    } else {
        sortStage.order = 1;
        sortStage.createdAt = -1;
    }

    const result = await Category.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
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
        .populate('moduleId', 'title')
        .populate('pcategoryId', 'name');
    if (!category) throw new APIError(404, 'Category not found');
    return category;
};

export const update = async (id, data) => {
    const category = await Category.findById(id);
    if (!category) throw new APIError(404, 'Category not found');

    if (data.name && data.name !== category.name) {
        const existing = await Category.findOne({ pcategoryId: category.pcategoryId, name: data.name });
        if (existing) {
            throw new APIError(400, 'Category with this name already exists in this parent category');
        }
    }

    Object.assign(category, data);
    await category.save();
    return category;
};

export const remove = async (id) => {
    const category = await Category.findById(id);
    if (!category) throw new APIError(404, 'Category not found');

    const childCount = await SubCategory.countDocuments({ categoryId: id });
    if (childCount > 0) {
        throw new APIError(400, `Cannot delete. This Category has ${childCount} related sub-categories.`);
    }

    await category.deleteOne();
    return true;
};

export const toggle = async (id) => {
    const category = await Category.findById(id);
    if (!category) throw new APIError(404, 'Category not found');

    category.isActive = !category.isActive;
    await category.save();
    return category;
};

export const getCategoryTreeService = async () => {
    const pipeline = [
        { $match: { isActive: true } },
        { $sort: { order: 1 } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'pcategoryId',
                as: 'categories',
                pipeline: [
                    { $match: { isActive: true } },
                    { $sort: { order: 1 } },
                    {
                        $lookup: {
                            from: 'subcategories',
                            localField: '_id',
                            foreignField: 'categoryId',
                            as: 'subCategories',
                            pipeline: [
                                { $match: { isActive: true } },
                                { $sort: { order: 1 } },
                                { $project: { name: 1, slug: 1, image: 1, _id: 1, order: 1 } }
                            ],
                        },
                    },
                    { $project: { name: 1, slug: 1, image: 1, subCategories: 1, _id: 1, order: 1 } }
                ],
            },
        },
        { $project: { name: 1, slug: 1, image: 1, categories: 1, _id: 1, moduleId: 1, order: 1 } }
    ];

    return await Pcategory.aggregate(pipeline);
};
