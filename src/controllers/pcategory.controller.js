import Pcategory from "../models/pcategory.model.js";
import { APIError } from "../middleware/errorHandler.js";
import { generateSlug } from "../utils/slug.js";

// POST CREATE

export const createpCategory = async (req, res, next) => {
  try {
    const files = req.files;

    const categoryIcon = files?.categoryIcon
      ? files.categoryIcon[0].location
      : null;

    const categoryImage = files?.categoryImage
      ? files.categoryImage[0].location
      : null;

    const { type, name } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        message: "Type and Name are required",
      });
    }

    const exists = await Pcategory.exists({ type: type, name: name });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Pcategory already exists",
      });
    }

    const finalSlug = await generateSlug(
      name,
      async (value) => await Pcategory.exists({ slug: value })
    );

    const pcategory = await Pcategory.create({
      name,
      slug: finalSlug,
      type,
      icon: categoryIcon,
      image: categoryImage,
    });

    res.status(200).json({
      success: true,
      message: "PCategory created successfully",
      data: pcategory,
    });
  } catch (error) {
    next(error);
  }
};

// PUT UPDATE

export const updatepCategory = async (req, res, next) => {
  try {
    const files = req.files;
    const { name, type } = req.body;
    let { slug } = req.body;
    const { id } = req.params;
    const categoryIcon = files?.categoryIcon
      ? files.categoryIcon[0].location
      : null;
    const categoryImage = files?.categoryImage
      ? files.categoryImage[0].location
      : null;
    console.log(id);

    const exist = await Pcategory.findById(id);
    console.log(exist);

    if (!exist) {
      throw new APIError(404, "Category not found");
    }

    if (slug || name) {
      slug = await generateSlug(
        slug || name,
        async (value) =>
          await Pcategory.exists({
            slug: value,
            _id: { $ne: id },
          })
      );
    }

    if (name || type) {
      const duplicate = await Pcategory.findOne({
        _id: { $ne: id },
        name: name ?? exist.name,
        type: type ?? exist.type,
      });

      if (duplicate) {
        throw new APIError(
          409,
          "Category with same name and type already exists"
        );
      }
    }

    const updateData = {};

    if (type !== undefined) updateData.type = type;
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (categoryIcon) updateData.icon = categoryIcon;
    if (categoryImage) updateData.image = categoryImage;

    const updated = await Pcategory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "PCategory updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

//PATCH DELETE

export const toggle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exist = await Pcategory.findById(id);

    if (!exist) {
      throw new APIError(404, "Category not found");
    }

    exist.isActive = !exist.isActive;
    await exist.save();

    res.status(200).json({
      success: true,
      message: `p-category ${exist.isActive ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    next(error);
  }
};

// PUBLIC  GET

// GET ALL

export const getAllpCategory = async (req, res, next) => {
  try {
    const { page, limit, search, type } = req.query;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "desc";

    const skip = (Number(page || 1) - 1) * Number(limit || 12);

    const filter = {
      isActive: true,
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    const [categories, total] = await Promise.all([
      Pcategory.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Pcategory.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      results: categories.length,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

// GET BY ID
export const getpCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Pcategory.findById(id);

    if (!category) {
      throw new APIError(404, "Pcategory not found");
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
