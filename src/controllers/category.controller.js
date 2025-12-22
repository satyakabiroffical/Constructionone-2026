import Category from "../models/category.model.js";


export const  createCategory = async (req,res,next)=>{
    try {
        const files = req.files || {};

        const categoryIcon = files?.categoryIcon?files.categoryIcon[0].location:null;

        const categoryImage= files?.categoryImage?files.categoryImage[0].location:null;

        const {type , name} = req.body;

        const exists = await findone({type });
        if(exists){
            return res.status(400).json({
            success: false,
            message: "Category already exists",
            });
        }

        const category = await Category.create({req.body})
        
    } catch (error) {
        next(error)
    }
}