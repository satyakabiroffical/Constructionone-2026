import SubCategory from '../models/category/subCategory.model.js';
import Category from '../models/category/category.model.js';
import Pcategory from '../models/category/pcategory.model.js';
import mongoose from 'mongoose';
import { APIError } from '../middlewares/errorHandler.js';

export const create = async (data, userId) => {
    const { moduleId, pcategoryId, categoryId, name } = data;

    // Validate Parent and Category exist
    const parent = await Pcategory.findById(pcategoryId);
    if (!parent) throw new APIError(404, 'Parent Category not found');

    const category = await Category.findById(categoryId);
    if (!category) throw new APIError(404, 'Category not found');

    const existing = await SubCategory.findOne({ categoryId, name });
    if (existing) {
        throw new APIError(400, 'SubCategory with this name already exists in this category');
    }

    const subCategory = await SubCategory.create({
        ...data,
        createdBy: userId,
    });

    return subCategory;
};

export const getAll = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, moduleId, pcategoryId, categoryId, isActive, sort } = query;

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

    if (categoryId) {
        matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
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

    const result = await SubCategory.aggregate([
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
    const subCategory = await SubCategory.findById(id)
        .populate('moduleId', 'title')
        .populate('pcategoryId', 'name')
        .populate('categoryId', 'name');
    if (!subCategory) throw new APIError(404, 'SubCategory not found');
    return subCategory;
};

export const update = async (id, data) => {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) throw new APIError(404, 'SubCategory not found');

    if (data.name && data.name !== subCategory.name) {
        const existing = await SubCategory.findOne({ categoryId: subCategory.categoryId, name: data.name });
        if (existing) {
            throw new APIError(400, 'SubCategory with this name already exists in this category');
        }
    }

    Object.assign(subCategory, data);
    await subCategory.save();
    return subCategory;
};

export const remove = async (id) => {
    const subCategory = await SubCategory.findByIdAndDelete(id);
    if (!subCategory) throw new APIError(404, 'SubCategory not found');
    return true;
};

export const toggle = async (id) => {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) throw new APIError(404, 'SubCategory not found');

    subCategory.isActive = !subCategory.isActive;
    await subCategory.save();
    return subCategory;
};
