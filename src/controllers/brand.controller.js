import Brand from "../models/brand.model.js";

import { APIError } from "../middleware/errorHandler.js";
import { generateSlug } from "../utils/slug.js";


export const createBrand = async (req,res,next)=>{
    try {

        const { name, description } = req.body;

        // console.log(req.body);

        
        const files = req.files;

        const brandImage = files?.brandImage?files.brandImage[0].location:null;

        const finalSlug = await generateSlug(name,
            async(value)=> await Brand.exists({slug:value})
        )
        
        const brand = await Brand.create({
            name,description,slug:finalSlug,logo:brandImage
        })

         return res.status(201).json({
            success: true,
            message: "Brand created successfully",
            data: brand,
        });
        
    } catch (error) {
        next(error)
    }
}

export const updateBrand = async (req,res,next)=>{
    try {
        const {id} = req.params;
        const {name,description}=req.body;
        let slug = req.body.slug;

        const files = req.files;

        const exists = await Brand.findById(id);

        if(!exists){
            throw new APIError(404,"Brand not found");
        }


        const brandImage = files?.brandImage?files.brandImage[0].location:exists.logo;


        if ( slug || name) {
              slug = await generateSlug(
                slug || name,
                async (value) =>
                  await Brand.exists({ slug: value, _id: { $ne: id } })
              );
        }
        const updatebrand = await Brand.findByIdAndUpdate(id,{name,slug,description,logo:brandImage},{
            new:true,runValidators:true
        })
         return res.status(200).json({
            success: true,
            message: "Brand updated successfully",
            data: updatebrand,
        });
    } catch (error) {
        next(error)
    }
}

export const toggle = async (req, res, next) => {
    try {
        const { id } = req.params;

        const brand = await Brand.findById(id);

        if (!brand) {
            throw new APIError(404, "Brand not found");
        }

        brand.isActive = !brand.isActive
        await brand.save();

        res.status(200).json({
            success: true,
            message: `Brand ${brand.isActive ? "enabled" : "disabled"}`
        })
    } catch (error) {
        next(error)
    }
}


// PUBLIC CONTROLLERS

// GETALL

export const getAllBrands = async (req, res, next)=>{
    try {
         const queryObj = { ...req.query };

        //  pagination
        const page = Number(queryObj.page) || 1;
        const limit = Number(queryObj.limit) || 10;
        const skip = (page - 1) * limit;

        const sortBy = queryObj.sortBy || "createdAt";
        const sortOrder = queryObj.sortOrder === "asc" ? 1 : -1;

        ["page", "limit", "sortBy", "sortOrder", "search"].forEach(el => delete queryObj[el]);

        const filter ={};
        
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: "i" } },
               
            ];
        }
        const total = await Brand.countDocuments(filter);
        const brand = await Brand.find(filter)
                                .sort({ [sortBy]: sortOrder })
                                .limit(limit)
                                .skip(skip)
        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total/limit),
            data: brand
        });

    } catch (error) {
        next(error)
    }
}


export const getBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const brand = await Brand.findOne({ slug: slug }, { new: true });

        if (!brand) {
            throw new APIError(404, "Brand not found");
        }

        res.status(200).json({
            success: true,
            data: brand
        });

    } catch (error) {
        next(error)
    }
}



export const getById= async (req, res, next) => {
    try {
        const { id } = req.params;

        const brand = await Brand.findById(id);

        if (!brand) {
            throw new APIError(404, "Brand not found");
        }

        res.status(200).json({
            success: true,
            data: brand
        });

    } catch (error) {
        next(error)
    }
}

