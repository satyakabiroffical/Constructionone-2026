import {
    createCategoryService,
    getCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    toggleCategoryStatusService,
    deleteCategoryService,
} from '../../services/category.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * Create Main Category
 */
export const createMainCategory = async (req, res, next) => {
    try {
        const { title, order, brandId } = req.body;
        const image = req.file ? req.file.location : null;

        const category = await createCategoryService({
            title,
            image,
            order,
            brandId,
            type: 'MAIN',
            parentId: null,
            createdBy: req.user._id,
        });

        return res.status(201).json(new ApiResponse(201, category, 'Main category created successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Main Categories
 */
export const getMainCategories = async (req, res, next) => {
    try {
        const { search, page, limit, sortBy, sortOrder, isActive } = req.query;

        const result = await getCategoriesService({
            type: 'MAIN',
            search,
            page,
            limit,
            sortBy,
            sortOrder,
            isActive,
        });

        return res.status(200).json(
            new ApiResponse(200, result.data, 'Main categories fetched successfully', result.pagination)
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Main Category
 */
export const getMainCategoryById = async (req, res, next) => {
    try {
        const category = await getCategoryByIdService(req.params.id);

        if (category.type !== 'MAIN') {
            return res.status(400).json(new ApiResponse(400, null, 'Not a main category'));
        }

        return res.status(200).json(new ApiResponse(200, category, 'Main category fetched successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Update Main Category
 */
export const updateMainCategory = async (req, res, next) => {
    try {
        const { title, order, brandId } = req.body;
        const updateData = { title, order, brandId };

        // If new image uploaded, add to update data
        if (req.file) {
            updateData.image = req.file.location;
        }

        const category = await updateCategoryService(req.params.id, updateData);

        return res.status(200).json(new ApiResponse(200, category, 'Main category updated successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle Main Category Status
 */
export const toggleMainCategory = async (req, res, next) => {
    try {
        const category = await toggleCategoryStatusService(req.params.id);

        return res.status(200).json(
            new ApiResponse(200, category, `Main category ${category.isActive ? 'activated' : 'deactivated'} successfully`)
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Main Category
 */
export const deleteMainCategory = async (req, res, next) => {
    try {
        const result = await deleteCategoryService(req.params.id);

        return res.status(200).json(new ApiResponse(200, null, result.message));
    } catch (error) {
        next(error);
    }
};
