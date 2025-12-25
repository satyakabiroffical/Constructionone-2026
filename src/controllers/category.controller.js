import Category from "../models/category.model.js";
import { APIError } from "../middleware/errorHandler.js";
import { generateSlug } from "../utils/slug.js";

export const createCategory = async (req, res, next) => {
    try {
        const files = req.files || {};
        const { parentCategory } = req.body;

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

        const exists = await Category.findOne({ type, name });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }



        const finalSlug = await generateSlug(
            name,
            async (value) => await Category.exists({ slug: value })
        );

        const category = await Category.create({
            name,
            slug: finalSlug,
            type,
            pCategory: parentCategory || null,
            icon: categoryIcon,
            image: categoryImage,
        });
        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE CATEGORY

export const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const files = req.files;
        const { type, name, pCategory } = req.body;
        let slug = req.body.slug;

        //  Check category exists
        const exists = await Category.findById(id);
        if (!exists) {
            throw new APIError(404, "Category not found");
        }

        //  Generate / validate slug
        if (name || slug) {
            slug = await generateSlug(
                slug || name,
                async (value) =>
                    await Category.exists({
                        slug: value,
                        _id: { $ne: id },
                    })
            );
        }

        //  Duplicate check (name + type)
        if (name || type) {
            const duplicate = await Category.findOne({
                _id: { $ne: id },
                name: name ?? exists.name,
                type: type ?? exists.type,
            });

            if (duplicate) {
                throw new APIError(
                    409,
                    "Category with same name and type already exists"
                );
            }
        }

        //  Prepare update object
        const updateData = {};

        if (type !== undefined) updateData.type = type;
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (pCategory !== undefined) updateData.pCategory = pCategory;

        if (files?.categoryIcon) {
            updateData.icon = files.categoryIcon[0].location;
        }

        if (files?.categoryImage) {
            updateData.image = files.categoryImage[0].location;
        }

        // Single DB update
        const updated = await Category.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

// GET ALL CATEGORIES

export const getAllCategory = async (req, res, next) => {
    try {
        const queryObj = { ...req.query };


        const page = Number(queryObj.page) || 1;
        const limit = Number(queryObj.limit) || 10;
        const skip = (page - 1) * limit;


        const sortBy = queryObj.sortBy || "createdAt";
        const sortOrder = queryObj.sortOrder === "asc" ? 1 : -1;

        // remove non-filter params
        ["page", "limit", "sortBy", "sortOrder"].forEach(
            el => delete queryObj[el]
        );


        const filter = {};

        // search
        if (queryObj.search) {
            filter.name = { $regex: queryObj.search, $options: "i" };
        }

        // type filter
        if (queryObj.type) {
            filter.type = queryObj.type.toUpperCase();
        }

        // isActive filter (example: only active categories)
        filter.isActive = true;

        const total = await Category.countDocuments(filter)
        const categories = await Category.find(queryObj)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)

        res.status(200).json({
            success:true,
            results: categories.length,
            data: { categories },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        console.log(error.stack);
        next(error);
    }
};



//  GET CATEGORY

export const getCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category) {
            throw new APIError(
                409,
                "Category not found"
            );
        }

        res.status(200).json({
            success: true,
            data: category
        })

    } catch (error) {
        next(error)
    }
}

// TOGGLE

export const toggle = async (req, res, next) => {
    try {

        const { id } = req.params;
        console.log(id);

        const category = await Category.findById(id);

        if (!category) {
            throw new APIError(
                409,
                "Category not found"
            );
        }

        category.isActive = !category.isActive;
        await category.save();
        res.status(200).json({
            success: true,
            message: `${category.isActive ? "enable" : "diseble"}`
        })

    } catch (error) {
        next(error)
    }
}




