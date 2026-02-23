import * as homeSectionService from '../../services/homeSection.service.js';
import { catchAsync, APIError } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

// POST /api/v1/admin/home-sections
export const createHomeSection = catchAsync(async (req, res) => {
    const section = await homeSectionService.createSection(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, { section }, 'Home section created'));
});

// GET /api/v1/admin/home-sections
export const getAllHomeSections = catchAsync(async (req, res) => {
    const result = await homeSectionService.getAllSections(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Home sections fetched'));
});

// GET /api/v1/admin/home-sections/:id
export const getHomeSectionById = catchAsync(async (req, res) => {
    const section = await homeSectionService.getSectionById(req.params.id);
    res.status(200).json(new ApiResponse(200, { section }, 'Home section fetched'));
});

// PUT /api/v1/admin/home-sections/:id
export const updateHomeSection = catchAsync(async (req, res) => {
    const section = await homeSectionService.updateSection(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, { section }, 'Home section updated'));
});

// DELETE /api/v1/admin/home-sections/:id
export const deleteHomeSection = catchAsync(async (req, res) => {
    await homeSectionService.removeSection(req.params.id);
    res.status(200).json(new ApiResponse(200, null, 'Home section deleted'));
});

// PATCH /api/v1/admin/home-sections/:id/toggle
export const toggleHomeSection = catchAsync(async (req, res) => {
    const section = await homeSectionService.toggleSection(req.params.id);
    res.status(200).json(new ApiResponse(200, { section }, `Section ${section.isActive ? 'activated' : 'deactivated'}`));
});
