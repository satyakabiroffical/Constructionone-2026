import ServiceCategory from "../../models/serviceProvider/serviceCategory.model.js";

//admin methods
export const createServiceCategory = async (req, res) => {
  try {
    const { name, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await ServiceCategory.findOne({ name });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await ServiceCategory.create({
      name,
      icon,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Service category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const getAllServiceCategories = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", isActive } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const total = await ServiceCategory.countDocuments(query);

    const categories = await ServiceCategory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const getSingleServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const updateServiceCategory = async (req, res) => {
  try {
    const { name, icon, description, isActive } = req.body;

    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.name = name ?? category.name;
    category.icon = icon ?? category.icon;
    category.description = description ?? category.description;
    category.isActive = isActive ?? category.isActive;

    await category.save();
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const deleteServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const toggleServiceCategoryStatus = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = !category.isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${
        category.isActive ? "activated" : "deactivated"
      } successfully`,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
//user methods
export const getActiveServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true })
      .select("name icon description")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
