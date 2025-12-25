import Contect from "../models/contect.model.js";
import { APIError } from "../middleware/errorHandler.js";

export const createContect = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;

    const contect = await Contect.create({ name, email, phone, message },{
        new:true,
        runValidators: true
    });

    res.status(201).json({
      status: "success",
      message: "Thank you for contect us",
      data:contect,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContect = async (req,res,next)=>{
    try {

        const queryObj = {...req.query};

        // pagination
        const page = Number(queryObj.page) ||1;
        const limit = Number(queryObj.limit)||12;
        const skip = (page - 1) * limit;

        const sortBy = queryObj.sortBy || "-createdAt";
        const sortOrder = queryObj.sortOrder==="asc" ? 1 : -1;
        ["page", "limit", "sortBy", "sortOrder", "search"].forEach(
            el => delete queryObj[el]
        );

        const filter ={};
        
         if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } }
            ];
        }
        
        
        const contect = await Contect.find(filter)
                        .sort({[sortBy]:sortOrder})
                        .limit(limit)
                        .skip(skip)
        const total = contect.length;

        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data:contect
        });
    } catch (error) {
        next(error)
    }
}

export const getById = async (req, res , next)=>{
    try {
        const {id} = req.params;
        
        const contect = await Contect.findById(id);

        if(!contect){
             throw new APIError(404, "Brand not found");
        }
          res.status(200).json({
            success: true,
            data: contect
        });


    } catch (error) {
        next(error)
    }
}


export const toggle = async (req, res, next) => {
    try {
        const { id } = req.params;

        const contect = await Contect.findById(id);

        if (!contect) {
            throw new APIError(404, "Brand not found");
        }

        contect.isActive = !contect.isActive
        await contect.save();

        res.status(200).json({
            success: true,
            message: `Contect ${contect.isActive ? "enabled" : "disabled"}`
        })
    } catch (error) {
        next(error)
    }
}
