import Wishlist from "../../models/user/wishlist.model.js";

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
    const wishlist = await Wishlist.findOne({
      userId: req.user.id,
    }).populate("products");

    res.json(wishlist || { products: [] });
  } catch (error) {
    next(error);
  }
};
