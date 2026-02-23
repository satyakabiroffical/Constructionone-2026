// priyanshu
import Cart from "../../models/user/cart.model.js";
import calculateBillSummary from "../../services/calculateBillSummary.js";
import { APIError } from "../../middlewares/errorHandler.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Product from "../../models/vendorShop/product.model.js";
import redis from "../../config/redis.config.js";





export const addToCart = async (req, res, next) => {
  try {

    const { variantId, quantity } = req.body;
    const userId = req.user.id;

    if (!variantId || !quantity || quantity <= 0) {
      return next(new APIError(400, "VariantId and valid quantity required"));
    }

    // Find Variant + Product     
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return next(new APIError(404, "Variant not found"));
    }
    // console.log(variant);

    // const product = await Product.findById(variant.productId);

    // BULK LOGIC
    let finalQuantity = quantity;

    if (variant.Type === "BULK") {
      const moq = Number(variant.moq);

      if (quantity < moq) {
        return next(
          new APIError(400, `Minimum order quantity is ${moq}`)
        );
      }

      if (quantity % moq !== 0) {
        return next(
          new APIError(400, `Quantity must be a multiple of MOQ (${moq})`)
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


    const billSummary = await calculateBillSummary(cart.items);
    // Recalculate totalAmount
    cart.totalAmount = billSummary.grandTotal;
    // cart.items.reduce(
    //   (total , item) => total + item.totalPrice,
    //   0
    // );

    await cart.save();

    // Invalidate Cache
    await redis.del(`cart:${userId}`);

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

// Enhanced Get Cart
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `cart:${userId}`;

    // Check Cache
    const cachedCart = await redis.get(cacheKey);
    if (cachedCart) {
      return res.status(200).json(JSON.parse(cachedCart));
    }

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.variant",
      populate: {
        path: "productId",
        model: "Product",
        select: "name thumbnail slug",
      },
    });

    if (!cart) {
      return next(new APIError(404, "Cart not found"));
    }

    const validItems = cart.items.filter(
      (item) => item.variant && item.variant.productId
    );

    const billSummary = await calculateBillSummary(validItems);

    const enrichedItems = validItems.map((item) => {
      const product = item.variant.productId;

      return {
        itemId: item._id,
        variantId: item.variant._id,
        productId: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        discount: item.discount,
        totalPrice: item.totalPrice,
        product: {
          name: product.name,
          thumbnail: product.thumbnail,
          slug: product.slug,
        },
      };
    });



    const response = {
      success: true,
      message: "Cart retrieved successfully",
      cart: {
        _id: cart._id,
        items: enrichedItems,
        billSummary: {
          itemsTotal: billSummary.itemsTotal,
          taxPercentage: billSummary.taxPercentage,
          gstAmount: billSummary.gstAmount,
          deliveryCharge: billSummary.deliveryCharge,
          grandTotal: billSummary.grandTotal,
        },
      },
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};


export const updateCartItem = async (req, res, next) => {
  try {
    const { variantId, action } = req.body;
    const userId = req.user.id;

    // console.log(variantId, action, userId);

    if (!variantId || !action) {
      return next(new APIError(400, "VariantId and action are required"));
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new APIError(404, "Cart not found"));
    }
    // console.log(cart);
    const itemIndex = cart.items.findIndex(
      (item) => item.variant.toString() === variantId
    );

    if (itemIndex === -1) {
      return next(new APIError(404, "Item not found in cart"));
    }

    const item = cart.items[itemIndex];
    const variant = await Variant.findById(variantId);

    if (!variant) {
      return next(new APIError(404, "Variant not found"));
    }

    let moq = 1;
    if (variant.Type === "BULK" && variant.moq) {
      moq = variant.moq;
    }

    let newQuantity = item.quantity;

    if (action === "inc") {
      newQuantity += 1;
    } else if (action === "dec") {
      newQuantity -= 1;
    } else {
      return next(new APIError(400, "Invalid action. Use 'inc' or 'dec'"));
    }

    if (newQuantity < moq) {
      return next(new APIError(400, `Quantity cannot be less than MOQ (${moq})`));
    }

    if (variant.stock < newQuantity) {
      return next(new APIError(400, `Out of stock. Only ${variant.stock} available.`));
    }

    item.quantity = newQuantity;
    item.totalPrice = item.unitPrice * newQuantity;

    const billSummary = await calculateBillSummary(cart.items);
    cart.totalAmount = billSummary.grandTotal;

    await cart.save();

    await redis.del(`cart:${userId}`);

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new APIError(404, "Cart not found"));
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variant.toString() === variantId
    );

    if (itemIndex === -1) {
      return next(new APIError(404, "Item not found in cart"));
    }

    cart.items.splice(itemIndex, 1);

    // Recalculate Bill Summary
    if (cart.items.length > 0) {
      const billSummary = await calculateBillSummary(cart.items);
      cart.totalAmount = billSummary.grandTotal;
    } else {
      cart.totalAmount = 0;
    }

    await cart.save();

    // Invalidate Cache
    await redis.del(`cart:${userId}`);

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    next(error);
  }
};
