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
 * Create Sub Category
 */
export const createSubCategory = async (req, res, next) => {
    try {
        const { title, order, brandId, parentId } = req.body;
        const image = req.file ? req.file.location : null;

        if (!parentId) {
            return res.status(400).json(new ApiResponse(400, null, 'parentId is required for sub-category'));
        }

        const category = await createCategoryService({
            title,
            image,
            order,
            brandId,
            parentId,
            type: 'SUBCATEGORY',
            createdBy: req.user._id,
        });

        return res.status(201).json(new ApiResponse(201, category, 'Sub-category created successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Sub Categories
 */
export const getSubCategories = async (req, res, next) => {
    try {
        const { search, page, limit, sortBy, sortOrder, isActive, parentId } = req.query;

        const result = await getCategoriesService({
            type: 'SUBCATEGORY',
            search,
            page,
            limit,
            sortBy,
            sortOrder,
            isActive,
            parentId,
        });

        return res.status(200).json(
            new ApiResponse(200, result.data, 'Sub-categories fetched successfully', result.pagination)
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Sub Category
 */
export const getSubCategoryById = async (req, res, next) => {
    try {
        const category = await getCategoryByIdService(req.params.id);

        if (category.type !== 'SUBCATEGORY') {
            return res.status(400).json(new ApiResponse(400, null, 'Not a sub-category'));
        }

        return res.status(200).json(new ApiResponse(200, category, 'Sub-category fetched successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Update Sub Category
 */
export const updateSubCategory = async (req, res, next) => {
    try {
        const { title, order, brandId, parentId } = req.body;
        const updateData = { title, order, brandId, parentId };

        // If new image uploaded, add to update data
        if (req.file) {
            updateData.image = req.file.location;
        }

        const category = await updateCategoryService(req.params.id, updateData);

        return res.status(200).json(new ApiResponse(200, category, 'Sub-category updated successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle Sub Category Status
 */
export const toggleSubCategory = async (req, res, next) => {
    try {
        const category = await toggleCategoryStatusService(req.params.id);

        return res.status(200).json(
            new ApiResponse(200, category, `Sub-category ${category.isActive ? 'activated' : 'deactivated'} successfully`)
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Sub Category
 */
export const deleteSubCategory = async (req, res, next) => {
    try {
        const result = await deleteCategoryService(req.params.id);

        return res.status(200).json(new ApiResponse(200, null, result.message));
    } catch (error) {
        next(error);
    }
};
