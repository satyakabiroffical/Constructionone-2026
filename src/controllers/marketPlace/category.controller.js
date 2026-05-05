import subCategoryModel from "../../models/category/subCategory.model.js";
import {
  getCategoryTreeService,
  getCategoryTreeServiceForAdmin,
  getAllCategoriesService,
} from "../../services/category.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

//users
export const getCategoryTree = async (req, res, next) => {
  try {
    const categoryTree = await getCategoryTreeService();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          categoryTree,
          "Category tree fetched successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await getAllCategoriesService(req.query);

    return res
      .status(200)
      .json(
        new ApiResponse(200, categories, "Categories fetched successfully"),
      );
  } catch (error) {
    next(error);
  }
};

//getAllSubCatogrybyCatogryId
export const getsubCategoriesByCategoryId = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const subCategories = await subCategoryModel
      .find({
        categoryId,
        isActive: true,
      })
      .select("name image");
    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//admin
export const getCategoryTreeForAdmin = async (req, res, next) => {
  try {
    const categoryTree = await getCategoryTreeServiceForAdmin(req.query);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          categoryTree,
          "Admin category tree fetched successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};
