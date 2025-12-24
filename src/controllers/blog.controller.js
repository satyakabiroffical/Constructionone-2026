import Blog from "../models/blog.model.js";
import { generateSlug } from "../utils/slug.js";
import { APIError } from "../middleware/errorHandler.js";

export const createBlog = async (req, res, next) => {
    try {
        const file = req.file;

        const { title, description, content, author, pcategory, tags } = req.body;

        const blogImage = req.file ? req.file.location : null;

        if (!title || !description || !content) {
            return res.status(400).json({
                success: false,
                message: "Title, description, and content are required",
            });
        }

        const finalSlug = await generateSlug(
            title,
            async (value) => await Blog.exists({ slug: value })
        );

        const blog = await Blog.create({
            title,
            description,
            content,
            author,
            pcategory: pcategory || null,
            tags,
            slug: finalSlug,
            image: blogImage,
        });

        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: blog,
        });
    } catch (error) {
        next(error);
    }
};

export const updateBlog = async (req, res, next) => {
    try {
        const file = req.file;
        let { slug } = req.params;
        const { title, description, content, author, pcategory, tags } = req.body;

        const blog = await Blog.findOne({ slug });
        if (!blog) {
            throw new APIError(404, "Blog not found");
        }

        let finalSlug = blog.slug;
        if (title) {
            finalSlug = await generateSlug(
                title,
                async (value) => await Blog.exists({ slug: value, _id: { $ne: blog._id } })
            );
        }

        const updateData = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (content !== undefined) updateData.content = content;
        if (author !== undefined) updateData.author = author;
        if (pcategory !== undefined) updateData.pcategory = pcategory;
        if (tags !== undefined) updateData.tags = tags;
        updateData.slug = finalSlug;
        if (file) {
            updateData.image = file.location;
        }

        const updatedBlog = await Blog.findByIdAndUpdate(blog._id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            data: updatedBlog,
        });
    } catch (error) {
        next(error);
    }
};


//PATCH DELETE


export const toggle = async (req, res, next) =>{
    try {
        const {id} = req.params;

        const exist = await Blog.findById(id);

        if(!exist){
            throw new APIError(404, "Blog not found");
        }

        exist.isActive =! exist.isActive
        await exist.save();

        res.status(200).json({
            success:true,
           message: `Blog ${exist.isActive ? "enabled" : "disabled"}`
        })

    } catch (error) {
        next(error)
    }
}

// PUBLIC 

// get all bog

export const getAllBlogs = async (req, res, next) => {
    try {
        const queryObj = { ...req.query };

        //  pagination
        const page = Number(queryObj.page) || 1;
        const limit = Number(queryObj.limit) || 10;
        const skip = (page - 1) * limit;

        const sortBy = queryObj.sortBy || "createdAt";
        const sortOrder = queryObj.sortOrder === "asc" ? 1 : -1;

        ["page", "limit", "sortBy", "sortOrder", "search"].forEach(
            el => delete queryObj[el]
        );

        const filter = {};

        //  filters
        if (queryObj.type) filter.type = queryObj.type;
        if (queryObj.pcategory) filter.pcategory = queryObj.pcategory;
        if (queryObj.author) filter.author = queryObj.author;
        if (queryObj.isActive !== undefined)
            filter.isActive = queryObj.isActive === "true";

        if (queryObj.tags) {
            filter.tags = { $in: queryObj.tags.split(",") };
        }

        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: "i" } },
                { content: { $regex: req.query.search, $options: "i" } }
            ];
        }

        const blogs = await Blog.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments(filter);

        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: blogs
        });
    } catch (error) {
        next(error)
    }
};

// get by slug

export const getBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOneA({ slug: slug });

       

        if (!blog) {
            throw new APIError(404, "Blog not found");
        }

        res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        next(error)
    }
}
