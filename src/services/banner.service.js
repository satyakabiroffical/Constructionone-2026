// Written by Pradeep
import Banner from '../models/banner/banner.model.js';
import { APIError } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';

/**
 * Create a new banner
 */
export const create = async (data, userId) => {
    const banner = await Banner.create({ ...data, createdBy: userId });
    return banner;
};

/**
 * Get all banners — admin view (pagination, search, filter)
 */
export const getAll = async (query) => {
    const { page = 1, limit = 10, moduleId, pageSlot, position, isActive, sort } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchStage = {};
    if (moduleId) matchStage.moduleId = new mongoose.Types.ObjectId(moduleId);
    if (pageSlot) matchStage.page = pageSlot.toUpperCase();
    if (position) matchStage.position = position.toUpperCase();
    if (isActive === 'true') matchStage.isActive = true;
    if (isActive === 'false') matchStage.isActive = false;

    const sortStage = {};
    if (sort) {
        const [field, dir] = sort.split(':');
        sortStage[field] = dir === 'desc' ? -1 : 1;
    } else {
        sortStage.order = 1;
        sortStage.createdAt = -1;
    }

    const result = await Banner.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        { $project: { __v: 0 } },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: parseInt(limit) }],
            },
        },
    ]);

    const data = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    return {
        banners: data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
        },
    };
};

/**
 * Get single banner by ID
 */
export const getById = async (id) => {
    const banner = await Banner.findById(id).lean();
    if (!banner) throw new APIError(404, 'Banner not found');
    return banner;
};

/**
 * Update banner
 */
export const update = async (id, data) => {
    const banner = await Banner.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    if (!banner) throw new APIError(404, 'Banner not found');
    return banner;
};

/**
 * Delete banner
 */
export const remove = async (id) => {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw new APIError(404, 'Banner not found');
    return banner;
};

/**
 * Toggle isActive — atomic
 */
export const toggle = async (id) => {
    const banner = await Banner.findByIdAndUpdate(
        id,
        [{ $set: { isActive: { $not: '$isActive' } } }],
        { new: true }
    );
    if (!banner) throw new APIError(404, 'Banner not found');
    return banner;
};

/**
 * Public: get active scheduled banners for a module + page + optional position
 * Automatically filters:
 *  - isActive = true
 *  - current date is between startDate and endDate (or null = always show)
 */
export const getPublicBanners = async ({ moduleId, page, position }) => {
    if (!moduleId) throw new APIError(400, 'moduleId is required');
    if (!page) throw new APIError(400, 'page is required');

    const now = new Date();

    const matchStage = {
        moduleId: new mongoose.Types.ObjectId(moduleId),
        page: page.toUpperCase(),
        isActive: true,
        $and: [
            { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
    };

    if (position) matchStage.position = position.toUpperCase();

    const banners = await Banner.aggregate([
        { $match: matchStage },
        { $sort: { order: 1 } },
        {
            $project: {
                __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0,
                startDate: 0, endDate: 0,
            },
        },
    ]);

    return banners;
};
