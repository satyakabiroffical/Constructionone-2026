import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { quantity, productId } = req.body;

    quantity = Number(quantity);

    if (!productId)
      return res.status(400).json({ message: "productId required" });

    if (isNaN(quantity) || quantity <= 0)
      return res.status(400).json({ message: "Invalid quantity" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
      });
    }

    await cart.save();

    res.status(200).json({
      message: "Product added to cart",
      data: cart.items, //show only items
    });
  } catch (error) {
    next(error);
  }
};

export const getCartProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart)
      return res.status(200).json({ data: { items: [], totalAmount: 0 } });

    let totalAmount = 0;

    const items = cart.items.map((item) => {
      const product = item.productId;
      const price = product.salePrice ?? product.price;

      totalAmount += price * item.quantity;

      return {
        productId: product._id,
        title: product.title,
        price: product.price,
        salePrice: product.salePrice,
        quantity: item.quantity,
      };
    });

    res.status(200).json({
      message: "Cart fetched successfully",
      data: {
        items,
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    res.status(200).json({
      message: "Product removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await Cart.deleteOne({ userId: req.user.id });

    res.status(200).json({
      message: "Cart cleared successfully",
    });
  } catch (error) {
    next(error);
  }
};
