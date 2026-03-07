// priyanshu
import mongoose from "mongoose";
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
    const cacheKey = `cart:${userId}`;

    if (!variantId || !quantity || quantity <= 0) {
      return next(new APIError(400, "VariantId and valid quantity required"));
    }

    const variant = await Variant.findById(variantId)
      .populate("productId", "name thumbnail slug")
      .lean();

    if (!variant) {
      return next(new APIError(404, "Variant not found"));
    }

    // BULK LOGIC
    if (variant.Type === "BULK") {
      const moq = Number(variant.moq);

      if (quantity < moq)
        return next(new APIError(400, `Minimum order quantity is ${moq}`));

      if (quantity % moq !== 0)
        return next(
          new APIError(400, `Quantity must be multiple of MOQ (${moq})`)
        );
    }

    if (variant.stock < quantity)
      return next(new APIError(400, "Out of stock"));

    
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    const existingItem = cart.items.find(
      (item) => item.variant.toString() === variantId
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (variant.stock < newQty)
        return next(new APIError(400, "Not enough stock"));

      existingItem.quantity = newQty;
      existingItem.totalPrice = newQty * existingItem.unitPrice;
    } else {
      cart.items.push({
        variant: variant._id,
        quantity,
        unitPrice: variant.price,
        totalPrice: variant.price * quantity,
      });
    }

    const billSummary = await calculateBillSummary(cart.items);
    cart.totalAmount = billSummary.grandTotal;

    await cart.save();

    // Build SAME response structure as getCart
    const response = {
      success: true,
      message: "Cart updated successfully",
      cart: {
        _id: cart._id,
        items: cart.items.map((item) => ({
          variantId: variant._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            name: variant.productId.name,
            thumbnail: variant.productId.thumbnail,
            slug: variant.productId.slug,
          },
        })),
        billSummary,
      },
    };

    // Update cache instead of deleting
    await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};


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
    }).lean();

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


export const similarProducts = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // ── Redis Cache ──────────────────────────────────────────────
    const cacheKey = `similar:${productId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) return res.status(200).json(JSON.parse(cachedData));

    // ── Find source product ──────────────────────────────────────
    const product = await Product.findById(productId)
      .select("subcategoryId categoryId")
      .lean();

    if (!product) {
      return next(new APIError(404, "Product not found"));
    }

    // ── Aggregation pipeline ─────────────────────────────────────
    const pipeline = [
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(productId) },
          subcategoryId: product.subcategoryId, 
          disable: false,
          varified: true,
        },
      },
      { $limit: 10 },

      {
        $lookup: {
          from: "variants",
          let: { pid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$pid"] },
                disable: false,
              },
            },
            { $sort: { price: 1 } },
            { $limit: 1 },
            {
              $project: {
                price: 1,
                mrp: 1,
                discount: 1,
                discountAmount: 1,
                Type: 1,
              },
            },
          ],
          as: "defaultVariant",
        },
      },

      { $match: { defaultVariant: { $ne: [] } } },

      {
        $project: {
          name: 1,
          slug: 1,
          thumbnail: 1,
          avgRating: 1,
          reviewCount: 1,
          sold: 1,
          measurementUnit: 1,
          defaultVariant: { $arrayElemAt: ["$defaultVariant", 0] },
        },
      },
    ];

    const products = await Product.aggregate(pipeline);

    const response = {
      success: true,
      message: "Similar products fetched successfully",
      results: products.length,
      data: { products },
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};