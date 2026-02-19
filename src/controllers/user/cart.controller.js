// priyanshu
import Cart from "../../models/user/cart.model.js";
import calculateBillSummary from "../../services/calculateBillSummary.js";
// import Variant from "../../models/marketPlace/variant.model.js";
 
export const addToCart = async (req, res, next) => {
  try {
    const { variantId, quantity } = req.body;
    const userId = req.user.id;

    if (!variantId || !quantity || quantity <= 0) {
      return next(new APIError(400, "VariantId and valid quantity required"));
    }

    // Find Variant + Product
    const variant = await Variant.findById(variantId).populate("product");
    if (!variant) {
      return next(new APIError(404, "Variant not found"));
    }

    const product = variant.product;

    // BULK LOGIC
    let finalQuantity = quantity;

    if (product.type === "bulk") {
      const minQty = product.minOrderQty;

      if (quantity < minQty) {
        return next(
          new APIError(400, `Minimum order quantity is ${minQty}`)
        );
      }

      // Optional (recommended for bulk)
      if (quantity % minQty !== 0) {
        return next(
          new APIError(400, `Quantity must be multiple of ${minQty}`)
        );
      }
    }

    // Stock Check
    if (variant.stock < finalQuantity) {
      return next(new APIError(400, "Out of stock"));
    }

    // Find or Create Cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check existing item
    const existingItem = cart.items.find(
      (item) => item.variant.toString() === variantId
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + finalQuantity;

      // Re-check stock
      if (variant.stock < newQuantity) {
        return next(new APIError(400, "Not enough stock available"));
      }

      existingItem.quantity = newQuantity;
      existingItem.totalPrice = newQuantity * existingItem.unitPrice;
    } else {
      cart.items.push({
        variant: variant._id,
        quantity: finalQuantity,
        unitPrice: variant.price,
        totalPrice: variant.price * finalQuantity,
      });
    }

    // Recalculate totalAmount
    cart.totalAmount = cart.items.reduce(
      (total , item) => total + item.totalPrice,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items.variant");
    if (!cart) {
      return next(new APIError(404, "Cart not found"));
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    cart.items.splice(itemIndex, 1);
    await cart.save();
    res.json(cart);
  } catch (error) {
    next(error);
  }
};
