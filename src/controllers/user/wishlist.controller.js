import Wishlist from "../../models/user/wishlist.model.js";
import redisConnection from "../../config/redis.config.js";

export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });
    }

    const index = wishlist.products.findIndex(
      (id) => id.toString() === productId,
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

    await redisConnection.set(
      `wishlist:${userId}`,
      JSON.stringify(wishlist),
      "EX",
      300, // Cache for 10 minutes
    );
    res.json({
      message,
      wishlist,
    });
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cached = await redisConnection.get(`wishlist:${userId}`);

    if (cached) {
      return res.status(200).json({ data: JSON.parse(cached) });
    }

    const wishlist = await Wishlist.findOne({ userId }).populate("products");

    await redisConnection.set(
      `wishlist:${userId}`,
      JSON.stringify(wishlist || { products: [] }),
      "EX",
      600, // Cache for 10 minutes
    );

    res.json({ data: wishlist || { products: [] } });
  } catch (error) {
    next(error);
  }
};
