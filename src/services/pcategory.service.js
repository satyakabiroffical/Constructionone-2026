import Pcategory from '../models/category/pcategory.model.js';
import Category from '../models/category/category.model.js';
import mongoose from 'mongoose';
import { APIError } from '../middlewares/errorHandler.js'; // Ensure path is correct relative to service

export const create = async (data, userId) => {
    const { moduleId, name } = data;

    const existing = await Pcategory.findOne({ moduleId, name });
    if (existing) {
        throw new APIError(400, 'Pcategory with this name already exists in this module');
    }

    const pcategory = await Pcategory.create({
        ...data,
        createdBy: userId,
    });

    return pcategory;
};

export const getAll = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, moduleId, isActive, sort } = query;

    const matchStage = {};

    if (search) {
        matchStage.name = { $regex: search, $options: 'i' };
    }

    if (moduleId) {
        matchStage.moduleId = new mongoose.Types.ObjectId(moduleId);
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

    const result = await Pcategory.aggregate([
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
    const pcategory = await Pcategory.findById(id).populate('moduleId', 'title');
    if (!pcategory) throw new APIError(404, 'Pcategory not found');
    return pcategory;
};

export const update = async (id, data) => {
    const pcategory = await Pcategory.findById(id);
    if (!pcategory) throw new APIError(404, 'Pcategory not found');

    // Verify name uniqueness if name is changing
    if (data.name && data.name !== pcategory.name) {
        const existing = await Pcategory.findOne({ moduleId: pcategory.moduleId, name: data.name });
        if (existing) {
            throw new APIError(400, 'Pcategory with this name already exists in this module');
        }
    }

    Object.assign(pcategory, data);
    await pcategory.save();
    return pcategory;
};

export const remove = async (id) => {
    const pcategory = await Pcategory.findById(id);
    if (!pcategory) throw new APIError(404, 'Pcategory not found');

    const childCount = await Category.countDocuments({ pcategoryId: id });
    if (childCount > 0) {
        throw new APIError(400, `Cannot delete. This Pcategory has ${childCount} related categories.`);
    }

    await pcategory.deleteOne();
    return true;
};

export const toggle = async (id) => {
    const pcategory = await Pcategory.findById(id);
    if (!pcategory) throw new APIError(404, 'Pcategory not found');

    pcategory.isActive = !pcategory.isActive;
    await pcategory.save();
    return pcategory;
};
