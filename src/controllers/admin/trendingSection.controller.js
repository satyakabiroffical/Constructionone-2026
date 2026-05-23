import * as trendingService from "../../services/trendingSection.service.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import mongoose from "mongoose";
import TrendingSection from "../../models/trending/trendingSection.model.js";
import Product from "../../models/vendorShop/product.model.js";
export const createSection = catchAsync(async (req, res) => {
  const section = await trendingService.createTrendingSection(
    req.body,
    req.user.id,
  );
  return res
    .status(201)
    .json(
      new ApiResponse(201, section, "Trending Section created successfully"),
    );
});

export const getSections = catchAsync(async (req, res) => {
  const data = await trendingService.getAllTrendingSections(req.query);
  return res
    .status(200)
    .json(
      new ApiResponse(200, data, "Trending Sections retrieved successfully"),
    );
});

export const getSectionById = catchAsync(async (req, res) => {
  const section = await trendingService.getTrendingSectionById(req.params.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, section, "Trending Section retrieved successfully"),
    );
});

export const updateSection = catchAsync(async (req, res) => {
  const section = await trendingService.updateTrendingSection(
    req.params.id,
    req.body,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, section, "Trending Section updated successfully"),
    );
});

export const deleteSection = catchAsync(async (req, res) => {
  const section = await trendingService.removeTrendingSection(req.params.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, section, "Trending Section deleted successfully"),
    );
});

export const toggleSectionStatus = catchAsync(async (req, res) => {
  const section = await trendingService.toggleTrendingSection(req.params.id);
  const message = `Trending Section ${section.isActive ? "activated" : "deactivated"} successfully`;
  return res.status(200).json(new ApiResponse(200, section, message));
});

export const addProductsToTrendingSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "productIds array is required",
      });
    }

    const validProducts = await Product.find({
      _id: { $in: productIds },
    }).select("_id");

    const validIds = validProducts.map((p) => p._id);

    const updated = await TrendingSection.findByIdAndUpdate(
      sectionId,
      {
        $addToSet: {
          selectedProducts: { $each: validIds },
        },
      },
      { new: true }
    ).populate({
      path: "selectedProducts",
      select: "name images slug price mrp discount avgRating",
    });

    return res.status(200).json({
      success: true,
      message: "Products added successfully",
      totalProducts: updated.selectedProducts.length,
      selectedProducts: updated.selectedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAddedSingleProduct = async (req, res) => {
  try {
    const { sectionId, productId } = req.params;

    const updated = await TrendingSection.findByIdAndUpdate(
      sectionId,
      {
        $pull: { selectedProducts: productId },
      },
      { new: true }
    ).populate({
      path: "selectedProducts",
      select: "name images slug price mrp discount",
    });

    return res.status(200).json({
      success: true,
      message: "Product removed successfully",
      totalProducts: updated.selectedProducts.length,
      selectedProducts: updated.selectedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getTrendingSectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await TrendingSection.findById(id)
      .populate({
        path: "selectedProducts",
        select: "name images slug price mrp discount avgRating reviewCount",
      })
      .lean();

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Trending section not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trending section fetched successfully",
      data: {
        ...section,
        selectedProductsCount: section.selectedProducts?.length || 0,
        selectedProducts: section.selectedProducts?.map((p) => ({
          _id: p._id,
          name: p.name,
          images: p.images,
          price: p.price,
          mrp: p.mrp,
          discount: p.discount,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};