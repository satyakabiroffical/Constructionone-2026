import Wishlist from "../models/wishlist.model.js";

// Add product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id; // assuming auth middleware sets req.user
    const item = await Wishlist.create({ productId, userId });

    res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      data: item,
    });
  } catch (err) {
    // duplicate key from unique index
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product is already in wishlist",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get wishlist for user id
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const items = await Wishlist.find({ userId }).populate("productId");

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Remove from wishlist

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    await Wishlist.findOneAndDelete({ userId, productId });

    res.json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//clear wishlist
// export const clearWishlist = async (req, res) => {
//   try {
//     const userId = req.body._id;
//     await Wishlist.deleteMany({ userId: req.user._id });

//     res.json({ success: true, message: "Wishlist cleared" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
