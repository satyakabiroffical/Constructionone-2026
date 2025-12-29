import { connect } from "mongoose";
import Product from "../models/product.model.js";
import { generateSlug } from "../utils/slug.js";
import { APIError } from "../middleware/errorHandler.js";
import Cart from "../models/cart.model.js";

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    const { title, price, category, company } = req.body;

    // Generate unique slug (custom OR title-based)
    const finalSlug = await generateSlug(
      title,
      async (value) => await Product.exists({ slug: value })
    );

    // Collect S3 image URLs
    const images = req.files?.images?.length
      ? req.files.images.map((file) => file.location)
      : [];

    const product = await Product.create({
      ...req.body,
      slug: finalSlug,
      images,
    });

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};
// UPDATE PRODUCT
export const updateProduct = async (req, res, next) => {
  try {
    if (req.files?.images?.length) {
      req.body.images = req.files.images.map((file) => file.location);
    }

    // update unique slug
    if (req.body.slug || req.body.title) {
      req.body.slug = await generateSlug(
        req.body.slug || req.body.title,
        async (value) =>
          await Product.exists({ slug: value, _id: { $ne: req.params.id } })
      );
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      status: "success",
      message: "Product & Cart updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

//TOGGLE PRODUCT

export const toggleProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    console.log(product);

    if (!product) {
      throw new APIError(404, "Product not found");
    }

    product.isActive = !product.isActive;
    await product.save();
    res.json({
      status: "success",
      message: `product: ${product.isActive ? "enabled" : "disabeld"}`,
    });
  } catch (error) {
    next(error);
  }
};

// PUBLIC

//GET-PRODUCT

export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      isActive: true,
      _id: id,
    });

    if (!product) {
      throw new APIError(404, "Product not found");
    }
    res.json({
      status: "success",
      message: "Product data",
      data: { product },
    });
  } catch (error) {
    next(error);
    console.log(error);
  }
};

// GET ALL PRODUCT

export const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = "-createdAt", search } = req.query;

    const cacheKey = `products_${JSON.stringify(req.query)}`;

    // Cache check
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    // Filter object
    const filter = {};

    // SEARCH (title, description etc.)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination calc
    const skip = (page - 1) * limit;

    // Query
    const products = await Product.find(filter)
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));
    // .populate('category')

    const total = await Product.countDocuments(filter);

    const response = {
      status: "success",
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      results: products.length,
      data: { products },
    };

    // Cache save
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
    console.log(error.stack);
  }
};
