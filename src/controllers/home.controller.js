import HomeBanner from "../models/homeBanner.model.js";
import Pcategory from "../models/pcategory.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Blog from "../models/blog.model.js";


export const getHome = async (req, res, next) => {
    try {
        //  homeBanner
        const homeBanner = await HomeBanner.find({ enable: true })
            .sort({ position: 1 })
            .limit(10)
        //  parentCategory
        const pcategory = await Pcategory.find({ isActive: true })
            .sort({ createdAt: 1 })

        //  Categories
        const categories = await Category.find({ isActive: true })
            .populate("pCategory", "name slug")
            .sort({ createdAt: 1 });
        // product by category
        const productByCategory = await Promise.all(
            categories.map(async (cat) => {
                const products = await Product.find({
                    category: cat._id,
                    isActive: true,
                    status: "ACTIVE"
                })
                    .populate('brand')
                return {
                    category: {
                        _id: cat._id,
                        name: cat.name,
                        slug: cat.slug
                    },

                    products
                }
            })
        )
        //    Blog

        const blog = await Blog.find({ isActive: true })
            .select("title slug image views createdAt")
            .sort({ createdAt: -1 })
            .limit(5)


        // topCategory
        
        const topCategory = await Product.aggregate([
      // 1️⃣ Only active products
      {
        $match: {
          isActive: true,
          status: "ACTIVE",
          avgRating: { $gt: 0 }
        }
      },

      // 2️⃣ Group by pCategory
      {
        $group: {
          _id: "$pCategory",
          avgCategoryRating: { $avg: "$avgRating" },
          totalProducts: { $sum: 1 }
        }
      },

      // 3️⃣ Sort by rating (high → low)
      {
        $sort: { avgCategoryRating: -1 }
      },

      // 4️⃣ Join pcategory details
      {
        $lookup: {
          from: "pcategories", // collection name
          localField: "_id",
          foreignField: "_id",
          as: "pcategory"
        }
      },

      // 5️⃣ Convert array → object
      { $unwind: "$pcategory" },

      // 6️⃣ Final shape
      {
        $project: {
          _id: 0,
          pcategoryId: "$pcategory._id",
          name: "$pcategory.name",
          slug: "$pcategory.slug",
          type: "$pcategory.type",
          avgRating: { $round: ["$avgCategoryRating", 1] },
          totalProducts: 1
        }
      }
    ]);

        res.status(200).json({
            success: true,
            data: {
                homeBanner,
                productByCategory,
                blog,
                topCategory
            }
        })
    } catch (error) {
        next(error)
    }
}