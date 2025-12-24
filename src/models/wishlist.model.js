import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "--",
    },
  },
  { timestamps: true }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
