import Wishlist from "../../models/user/wishlist.model.js";
import RedisCache from "../../utils/redisCache.js";

export const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // Add validation
    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [productId],
      });

      await wishlist.save();
      await RedisCache.delete(`wishlist:${userId}`);

      return res.status(201).json({
        message: "Added to wishlist",
        wishlist,
      });
    }

    // Safer existence check
    const exists = wishlist.products.some(
      (id) => id && id.toString() === productId,
    );

    if (exists) {
      return res.status(400).json({
        message: "Product already in wishlist",
      });
    }

    wishlist.products.push(productId);
    await wishlist.save();
    await RedisCache.delete(`wishlist:${userId}`);

    res.status(200).json({
      message: "Added to wishlist",
      wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// export const toggleWishlist = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { productId } = req.body;
//     let wishlist = await Wishlist.findOne({ userId });

//     if (!wishlist) {
//       wishlist = new Wishlist({
//         userId,
//         products: [],
//       });
//     }

//     const index = wishlist.products.findIndex(
//       (id) => id.toString() === productId,
//     );

//     let message = "";

//     if (index > -1) {
//       wishlist.products.splice(index, 1);
//       message = "Removed from wishlist";
//     } else {
//       wishlist.products.push(productId);
//       message = "Added to wishlist";
//     }

//     await wishlist.save();
//     await RedisCache.delete(`wishlist:${userId}`);
//     res.json({
//       message,
//       wishlist,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // ✅ Product ID validation
    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });
    }

    // ✅ Clean null values from array (ek baar fix kar do)
    wishlist.products = wishlist.products.filter((id) => id !== null);

    // ✅ Safe findIndex with null check
    const index = wishlist.products.findIndex(
      (id) => id && id.toString() === productId, // ✅ pehle check karo id exist karti hai
    );

    let message = "";

    if (index > -1) {
      wishlist.products.splice(index, 1);
      message = "Removed from wishlist";
    } else {
      wishlist.products.push(productId);
      message = "Added to wishlist";
    }

    await wishlist.save();

    // Populate after save
    wishlist = await wishlist.populate({
      path: "products",
      select:
        "name price thumbnail avgRating reviewCount status vendorId createdAt disable",
    });

    await RedisCache.delete(`wishlist:${userId}`);

    res.json({
      message,
      data: wishlist.products,
    });
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cached = await RedisCache.get(`wishlist:${userId}`);
    if (cached) {
      return res.status(200).json({ data: JSON.parse(cached) });
    }
    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products",
        match: { disable: false },
        select:
          "name avgRating reviewCount status vendorId createdAt disable defaultVariantId images",
        populate: {
          path: "defaultVariantId",
          select: "price mrp discount Type moq discount size stock",
        },
      })
      .lean();

    await RedisCache.set(
      `wishlist:${userId}`,
      JSON.stringify(wishlist || { products: [] }),
    );

    res.json({ data: wishlist || { products: [] } });
  } catch (error) {
    next(error);
  }
};
