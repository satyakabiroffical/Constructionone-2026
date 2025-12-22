import { connect } from "mongoose";
import Product from "../models/product.model.js";
import { generateSlug } from "../utils/slug.js";
import { APIError } from '../middleware/errorHandler.js';


const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;


// CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    const { title, price, category, company } = req.body;

    // Basic validation
    if (!title || !price || !category || !company) {
      throw new APIError(
        400,
        "Title, price, category and company are required"
      );
    }

    // Generate unique slug (custom OR title-based)
    const finalSlug = await generateSlug(
      title,
      async (value) => await Product.exists({ slug: value })
    );

    // Collect S3 image URLs
    const images = req.files?.length
      ? req.files.map((file) => file.location)
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
    if (req.files?.length) {
      req.body.images = req.files.map((file) => file.location);
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
      throw new APIError(404,"Product not found");
    }
    res.json({
      status: "success",
      message: "Product updated successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};


//TOGGLE PRODUCT
export const toggleProduct = async (req, res, next)=>{
  try {
    const product = await Product.findById(req.params.id);
    console.log(product);

    if(!product){
      throw new APIError(404,"Product not found");
    }

    product.isActive= !product.isActive;
    await product.save();
    res.json({
      status: "success",
      message: `product: ${product.isActive?"enabled":"disabeld"}`,
    });

  } catch (error) {
    next(error);
  }
}

// PUBLIC

//GET-PRODUCT

export const getProduct = async (req, res, next)=>{
  try {
     const {id}= req.params;
     
     const product = await Product.findOne({
      isActive:true,
      _id:id
     })
      // .populate('category', 'name slug')
      // .populate('subCategory', 'name slug')
      // .populate('pCategory', 'name slug')
      // .populate('brand', 'name')
      // .populate('company', 'name')
      // .populate('offer')
      // .populate('features');

       if (!product) {
      throw new APIError(404, 'Product not found');
       }
      res.json({
      status: "success",
      message: "Product data",
      data: { product },
    });
    
  } catch (error) {
    next(error)
    console.log(error)
  }

}

// GET ALL PRODUCT

export const getAllProducts= async (req, res, next)=>{
  try {
    const cacheKey = `products_${JSON.stringify(req.query)}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }
    const queryObj={...req.query};
    ['page','sort','limit'].forEach(el=> delete queryObj[el]);

    const products = await Product.find(queryObj)
                    // .populate('category')
                    .sort(req.query.sort || '-createdAt')
                    .limit(req.query.limit || 12)
                    
    const response = {
      status: 'success',
      results: products.length,
      data: { products }
    };

    cache.set(cacheKey,{data:response, timestamp:Date.now()})
     res.json(response)
    
  } catch (error) {
    next(error)
    console.log(error.stack);
    
  }
}
