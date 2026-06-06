// priyanshu
import mongoose from "mongoose";
import Cart from "../../models/user/cart.model.js";
import calculateBillSummary from "../../services/calculateBillSummary.js";
import { APIError } from "../../middlewares/errorHandler.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Product from "../../models/vendorShop/product.model.js";
import Address from "../../models/user/address.model.js";
import redis from "../../config/redis.config.js";
import { getDistanceInKm } from "../../utils/getDistanceInKm.js";
import { VendorCompany } from "../../models/vendorShop/vendor.model.js";

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
          new APIError(400, `Quantity must be multiple of MOQ (${moq})`),
        );
    }

    if (variant.stock < quantity)
      return next(new APIError(400, "Out of stock"));

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    const existingItem = cart.items.find(
      (item) => item.variant.toString() === variantId,
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

// export const getCart = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const cacheKey = `cart:${userId}`;

//     // Check Cache
//     // const cachedCart = await redis.get(cacheKey);
//     // if (cachedCart) {
//     //   return res.status(200).json(JSON.parse(cachedCart));
//     // }
//     let deliveryOptions = [];
//     let cart = await Cart.findOne({ userId });
//     populate: [
//       {
//         path: "productId",
//         model: "Product",
//         select:
//           "name images thumbnail slug description vendorId measurementUnit avgRating leadTime productTypeId subcategoryId",
//       },
//       {
//         path: "productId.productTypeId", // agar Product schema mein ye field reference hai
//         model: "ProductType",
//         select: "typeName",
//       },
//       {
//         path: "productId.subcategoryId", // agar Subcategory schema mein ye field reference hai
//         model: "SubCategory",
//         select: "name",
//       },
//     ];

//     if (!cart) {
//       return res.status(404).json({ message: "Cart is empty" });
//     }

//     const validItems = cart.items.filter(
//       (item) => item.variant && item.variant.productId,
//     );

//     const billSummary = await calculateBillSummary(validItems);

//     const enrichedItems = validItems.map((item) => {
//       const product = item.variant.productId;

//       return {
//         itemId: item._id,
//         variantId: item.variant._id,
//         productId: product._id,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         mrp: item.mrp,
//         discount: item.discount,
//         totalPrice: item.totalPrice,
//         product: {
//           name: product.name,
//           thumbnail: product.thumbnail,
//           slug: product.slug,
//           images: product.images,
//           description: product.description,
//           vendorId: product.vendorId,
//           avgRating: product.avgRating,
//           measurementUnit: product.measurementUnit,
//           leadTime: product.leadTime,
//           deliveryOptions,
//           productTypeId: product.productTypeId,
//           subcategoryId: product.subcategoryId,
//         },
//       };
//     });

//     const response = {
//       success: true,
//       message: "Cart retrieved successfully",
//       cart: {
//         _id: cart._id,
//         items: enrichedItems,
//         billSummary: {
//           itemsTotal: billSummary.itemsTotal,
//           taxPercentage: billSummary.taxPercentage,
//           gstAmount: billSummary.gstAmount,
//           deliveryCharge: billSummary.deliveryCharge,
//           grandTotal: billSummary.grandTotal,
//         },
//       },
//     };

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     res.status(200).json(response);
//   } catch (error) {
//     return res.status(404).json({ message: error.message });
//   }
// };

// ----------------

// export const getCart = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const cacheKey = `cart:${userId}`;

//     // Proper populate chain
//     let cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.variant",
//         model: "Variant",
//         populate: {
//           path: "productId",
//           model: "Product",
//           select:
//             "name images thumbnail vendorId measurementUnit avgRating leadTime productTypeId subcategoryId",
//           populate: [
//             {
//               path: "productTypeId",
//               model: "ProductType",
//               select: "typeName",
//             },
//             {
//               path: "subcategoryId",
//               model: "SubCategory",
//               select: "name",
//             },

//             {
//               path: "vendorId", // Vendor/Company populate
//               model: "vendorCompany", // Maan lo aapka model Company hai
//               select: "companyName  address", // shopName aur other fields
//             },
//           ],
//         },
//       })
//       .lean();

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.status(404).json({ message: "Cart is empty" });
//     }

//     let deliveryOptions = [];
//     const validItems = cart.items.filter(
//       (item) => item.variant && item.variant.productId,
//     );

//     if (validItems.length === 0) {
//       return res.status(404).json({ message: "No valid items in cart" });
//     }

//     const billSummary = await calculateBillSummary(validItems);

//     const enrichedItems = validItems.map((item) => {
//       const variant = item.variant;
//       const product = variant.productId;

//       let vendorData = null;

//       if (product.vendorId) {
//         vendorData = {
//           _id: product.vendorId._id,
//           companyName: product.vendorId.companyName,
//           address: product.vendorId.address,
//         };
//       }

//       return {
//         itemId: item._id,
//         variantId: variant._id,
//         Type: variant.Type,
//         packageWeight: variant.packageWeight,
//         packageDimensions: variant.packageDimensions,
//         size: variant.size,
//         productId: product._id,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         mrp: item.mrp,
//         discount: item.discount,
//         totalPrice: item.totalPrice,
//         product: {
//           name: product.name,
//           thumbnail: product.thumbnail,
//           images: product.images[0],
//           vendorId: product.vendorId,
//           avgRating: product.avgRating,
//           measurementUnit: product.measurementUnit,
//           leadTime: product.leadTime,
//           deliveryOptions,
//           productTypeId: product.productTypeId,
//           subcategoryId: product.subcategoryId,
//         },
//         vendor: vendorData,
//       };
//     });

//     const response = {
//       success: true,
//       message: "Cart retrieved successfully",
//       cart: {
//         _id: cart._id,
//         items: enrichedItems,
//         billSummary: {
//           itemsTotal: billSummary.itemsTotal,
//           taxPercentage: billSummary.taxPercentage,
//           gstAmount: billSummary.gstAmount,
//           deliveryCharge: billSummary.deliveryCharge,
//           grandTotal: billSummary.grandTotal,
//         },
//       },
//     };

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
//     res.status(200).json(response);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: error.message });
//   }
// };

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `cart:${userId}`;

    // Check Cache
    // const cachedCart = await redis.get(cacheKey);
    // if (cachedCart) {
    //   return res.status(200).json(JSON.parse(cachedCart));
    // }
    let cart = await Cart.findOne({ userId })
      .populate({
        path: "items.variant",
        model: "Variant",
        populate: {
          path: "productId",
          model: "Product",
          select:
            "name images thumbnail vendorId measurementUnit avgRating leadTime productTypeId subcategoryId",
          populate: [
            {
              path: "productTypeId",
              model: "ProductType",
              select: "typeName",
            },
            {
              path: "subcategoryId",
              model: "SubCategory",
              select: "name",
            },
          ],
        },
      })
      .lean();

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // Collect all unique vendorIds from products
    const vendorIds = new Set();
    cart.items.forEach((item) => {
      if (item.variant?.productId?.vendorId) {
        vendorIds.add(item.variant.productId.vendorId.toString());
      }
    });

    // Directly find companies using vendorId match
    const companies = await VendorCompany.find({
      vendorId: { $in: Array.from(vendorIds) },
    })
      .select("companyName address vendorId")
      .lean();

    // Create mapping of vendorId -> company
    const companyMap = new Map();
    companies.forEach((company) => {
      if (company.vendorId) {
        companyMap.set(company.vendorId.toString(), {
          _id: company._id,
          companyName: company.companyName,
          address: company.address,
        });
      }
    });

    // let deliveryOptions = [];
    const validItems = cart.items.filter(
      (item) => item.variant && item.variant.productId,
    );

    if (validItems.length === 0) {
      return res.status(404).json({ message: "No valid items in cart" });
    }

    const billSummary = await calculateBillSummary(validItems);

    const enrichedItems = validItems.map((item) => {
      const variant = item.variant;
      const product = variant.productId;

      // Get company directly from vendorId
      const vendorIdStr = product.vendorId?.toString();
      const company = companyMap.get(vendorIdStr);

      return {
        itemId: item._id,
        variantId: variant._id,
        Type: variant.Type,
        packageWeight: variant.packageWeight,
        packageDimensions: variant.packageDimensions,
        size: variant.size,
        productId: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        discount: item.discount,
        totalPrice: item.totalPrice,
        deliveryOptions: item.deliveryOptions || [],
        product: {
          name: product.name,
          thumbnail: product.thumbnail,
          images:
            product.images && product.images[0]
              ? product.images[0]
              : product.images,
          avgRating: product.avgRating,
          measurementUnit: product.measurementUnit,
          leadTime: product.leadTime,
          productTypeId: product.productTypeId,
          subcategoryId: product.subcategoryId,
          shopName: company ? company.companyName : null,
        },
        // company: company,
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
    console.error(error);
    return res.status(500).json({ message: error.message });
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
      (item) => item.variant.toString() === variantId,
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
      return next(
        new APIError(400, `Quantity cannot be less than MOQ (${moq})`),
      );
    }

    if (variant.stock < newQuantity) {
      return next(
        new APIError(400, `Out of stock. Only ${variant.stock} available.`),
      );
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
      (item) => item.variant.toString() === variantId,
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
    // const pipeline = [
    //   {
    //     $match: {
    //       _id: { $ne: new mongoose.Types.ObjectId(productId) },
    //       subcategoryId: product.subcategoryId,
    //       disable: false,
    //       varified: true,
    //     },
    //   },
    //   { $limit: 10 },

    //   {
    //     $lookup: {
    //       from: "variants",
    //       let: { pid: "$_id" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: { $eq: ["$productId", "$$pid"] },
    //             disable: false,
    //           },
    //         },
    //         { $sort: { price: 1 } },
    //         // $limit: 1 remove kar diya
    //         {
    //           $project: {
    //             price: 1,
    //             mrp: 1,
    //             discount: 1,
    //             discountAmount: 1,
    //             size: 1,
    //             color: 1,
    //             stock: 1,
    //             Type: 1,
    //             moq: 1,
    //           },
    //         },
    //       ],
    //       as: "variants", // defaultVariant → variants
    //     },
    //   },

    //   // ── match bhi update ─────────────────────────────────────
    //   { $match: { variants: { $ne: [] } } },

    //   // { $match: { defaultVariant: { $ne: [] } } },

    //   {
    //     $project: {
    //       name: 1,
    //       slug: 1,
    //       thumbnail: 1,
    //       images: 1,
    //       vendorId: 1,
    //       avgRating: 1,
    //       reviewCount: 1,
    //       sold: 1,
    //       measurementUnit: 1,
    //       // defaultVariant: { $arrayElemAt: ["$defaultVariant", 0] },
    //       variants: 1,
    //     },
    //   },
    // ];

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

      // ===============================
      // VARIANTS
      // ===============================
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
            {
              $project: {
                price: 1,
                mrp: 1,
                discount: 1,
                discountAmount: 1,
                size: 1,
                color: 1,
                stock: 1,
                Type: 1,
                moq: 1,
              },
            },
          ],
          as: "variants",
        },
      },

      {
        $match: {
          variants: { $ne: [] },
        },
      },

      // ===============================
      // VENDOR PROFILE
      // ===============================
      {
        $lookup: {
          from: "vendorprofiles",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendorProfile",
        },
      },
      {
        $unwind: {
          path: "$vendorProfile",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ===============================
      // VENDOR COMPANY
      // ===============================
      {
        $lookup: {
          from: "vendorcompanies",
          localField: "vendorId",
          foreignField: "vendorId",
          as: "vendorCompany",
        },
      },
      {
        $unwind: {
          path: "$vendorCompany",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ===============================
      // RESPONSE
      // ===============================
      {
        $project: {
          name: 1,
          slug: 1,
          thumbnail: 1,
          images: 1,
          avgRating: 1,
          reviewCount: 1,
          sold: 1,
          measurementUnit: 1,
          variants: 1,

          vendor: {
            _id: "$vendorId",
            firstName: "$vendorProfile.firstName",
            lastName: "$vendorProfile.lastName",
            avgRating: "$vendorProfile.avgRating",
            totalReviews: "$vendorProfile.totalReviews",
            shopName: "$vendorCompany.companyName",
            shopImage: {
              $arrayElemAt: ["$vendorCompany.shopImages", 0],
            },
          },
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

// GET /cart/distances?addressId=123
// export const getCartWithDistances = async (req, res) => {
//   try {
//     // const userId = req.user.id;
//     const userId = "6992ebf155e45f668bce5b09";
//     const { addressId } = req.query;

//     // 1. Get User Address
//     const address = await Address.findOne({
//       _id: addressId,
//       userId,
//     });

//     if (!address) {
//       return res.status(404).json({ message: "Address not found" });
//     }

//     const userLat = address.location.coordinates[1];
//     const userLng = address.location.coordinates[0];

//     // 2. Get Cart
//     const cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.variant",
//         populate: {
//           path: "productId",
//           select: "name thumbnail slug vendorId vendorLocation",
//         },
//       })
//       .lean();

//     if (!cart) {
//       return res.status(404).json({ message: "Cart is empty" });
//     }

//     // 3. Distance Function
//     const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
//       const toRad = (val) => (val * Math.PI) / 180;
//       const R = 6371;

//       const dLat = toRad(lat2 - lat1);
//       const dLon = toRad(lon2 - lon1);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

//       return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
//     };

//     // 4. Build Response
//     const itemsWithDistance = cart.items
//       .filter((item) => item.variant && item.variant.productId)
//       .map((item) => {
//         const product = item.variant.productId;
//         const vendorLocation = product.vendorLocation;

//         let distance = 0;

//         if (vendorLocation && vendorLocation.coordinates) {
//           const [vendorLng, vendorLat] = vendorLocation.coordinates;

//           distance = getDistanceInKm(vendorLat, vendorLng, userLat, userLng);
//         }

//         return {
//           itemId: item._id,
//           productId: product._id,
//           name: product.name,
//           thumbnail: product.thumbnail,
//           quantity: item.quantity,
//           distance: Math.round(distance), // KM
//         };
//       });

//     return res.status(200).json({
//       success: true,
//       message: "Cart with distances",
//       items: itemsWithDistance,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

// export const checkoutPreview = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { addressId } = req.body;

//     if (!addressId) {
//       throw new APIError(400, "addressId is required");
//     }
//     // user selected address check
//     const address = await Address.findOne({
//       _id: addressId,
//       userId,
//     });

//     if (!address) {
//       throw new APIError(404, "Address not found");
//     }

//     // get cart
//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.variant",
//       populate: {
//         path: "productId",
//         model: "Product",
//         select: `
//           name
//           slug
//           images
//           serviceableDeliveryPincode
//           deliveryOptions
//           deliveryCharges
//           shippingCharges
//           vendorLocation
//         `,
//       },
//     });

//     if (!cart || !cart.items.length) {
//       throw new APIError(400, "Cart is empty");
//     }
//     const responseItems = [];
//     for (const item of cart.items) {
//       const variant = item.variant;
//       const product = variant.productId;

//       let availableDeliveryTypes = ["self", "logistic"];

//       // vendor delivery check by pincode
//       const isVendorAvailable = product.serviceableDeliveryPincode?.includes(
//         String(address.pincode),
//       );

//       if (isVendorAvailable) {
//         availableDeliveryTypes.push("vendor");
//       }

//       responseItems.push({
//         itemId: item._id,
//         productId: product._id,
//         variantId: variant._id,
//         productName: product.name,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         totalPrice: item.totalPrice,
//         availableDeliveryTypes,
//       });
//       item.deliveryOptions = availableDeliveryTypes;
//     }
//     await cart.save();
//     return res.status(200).json({
//       success: true,
//       message: "Select delivery type for products",
//       address: {
//         addressId: address._id,
//         pincode: address.pincode,
//       },
//       items: responseItems,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const checkoutPreview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.body;

    if (!addressId) {
      throw new APIError(400, "addressId is required");
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      throw new APIError(404, "Address not found");
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.variant",
      populate: {
        path: "productId",
        model: "Product",
        select: `
          name
          slug
          images
          serviceableDeliveryPincode
          deliveryCharges
          shippingCharges
          vendorLocation
        `,
      },
    });

    if (!cart || !cart.items.length) {
      throw new APIError(400, "Cart is empty");
    }

    const responseItems = [];

    for (const item of cart.items) {
      const variant = item.variant;
      const product = variant.productId;

      let availableDeliveryTypes = ["self", "logistic"];

      const isVendorAvailable = product.serviceableDeliveryPincode?.includes(
        String(address.pincode),
      );

      if (isVendorAvailable) {
        availableDeliveryTypes.push("vendor");
      }

      // cart me save
      item.deliveryOptions = availableDeliveryTypes;

      responseItems.push({
        itemId: item._id,
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        availableDeliveryTypes,
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Select delivery type for products",
      address: {
        addressId: address._id,
        pincode: address.pincode,
      },
      items: responseItems,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// METHOD 2: SELECT DELIVERY TYPE → SHOW DELIVERY FEE
// ============================================

// export const calculateDeliveryFee = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { addressId, items } = req.body;

//     /**
//      * req.body
//      *
//      * {
//      *   "addressId": "...",
//      *   "items": [
//      *     {
//      *       "variantId": "...",
//      *       "deliveryType": "vendor"
//      *     }
//      *   ]
//      * }
//      */

//     if (!addressId || !items?.length) {
//       throw new APIError(400, "addressId and items are required");
//     }

//     const address = await Address.findOne({
//       _id: addressId,
//       userId,
//     });

//     if (!address) {
//       throw new APIError(404, "Address not found");
//     }
//     const cart = await Cart.findOne({ userId }).populate({
//       path: "items.variant",
//       populate: {
//         path: "productId",
//         model: "Product",
//         select: `
//       name images
//       shippingCharges
//       deliveryCharges
//       vendorLocation
//       vendorId
//       deliveryOptions
//       serviceableDeliveryPincode
//         `,
//       },
//     });

//     if (!cart || !cart.items.length) {
//       throw new APIError(400, "Cart is empty");
//     }

//     const comapnyBillSummary = await calculateBillSummary(cart.items);
//     let subtotal = 0;
//     let totalDeliveryFee = 0;
//     const finalItems = [];

//     for (const cartItem of cart.items) {
//       const variant = cartItem.variant;
//       const product = variant.productId;
//       const selected = items.find(
//         (i) => i.variantId === variant._id.toString(),
//       );

//       if (!selected) continue;

//       const itemTotal = cartItem.quantity * cartItem.unitPrice;
//       subtotal += itemTotal;
//       const result = await calculateSingleItemDeliveryFee({
//         product,
//         variant,
//         quantity: cartItem.quantity,
//         userAddress: address.location,
//         deliveryType: selected.deliveryType,
//       });
//       totalDeliveryFee += result.deliveryFee;

//       finalItems.push({
//         productId: product._id,
//         variantId: variant._id,
//         productName: product.name,
//         vendorId: product.vendorId,
//         productImage: product.images,
//         quantity: cartItem.quantity,
//         itemTotal,
//         deliveryType: selected.deliveryType,
//         durationTime: result.duration,

//         distance: {
//           km: result.distanceKm || 0,
//           meter: result.distanceMeter || 0,
//         },
//         deliveryFee: result.deliveryFee,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Delivery fee calculated successfully",

//       billSummary: {
//         subtotal,
//         deliveryFee: totalDeliveryFee,
//         gstAmount: comapnyBillSummary.gstAmount,
//         taxPercentage: comapnyBillSummary.taxPercentage,
//         handlingCharge: comapnyBillSummary.handlingCharge,
//         grandTotal:
//           subtotal +
//           totalDeliveryFee +
//           comapnyBillSummary.gstAmount +
//           comapnyBillSummary.handlingCharge,
//       },
//       items: finalItems,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const calculateDeliveryFee = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { addressId, items } = req.body;

    /**
     * req.body
     *
     * {
     *   "addressId": "...",
     *   "items": [
     *     {
     *       "variantId": "...",
     *       "deliveryType": "vendor"
     *     }
     *   ]
     * }
     */

    if (!addressId || !items?.length) {
      throw new APIError(400, "addressId and items are required");
    }

    // ======================================================
    // ADDRESS
    // ======================================================

    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      throw new APIError(404, "Address not found");
    }

    // ======================================================
    // CART
    // ======================================================

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.variant",
      populate: {
        path: "productId",
        model: "Product",
        select: `
          name
          images
          shippingCharges
          deliveryCharges
          vendorLocation
          vendorId
          deliveryOptions
          serviceableDeliveryPincode
          measurementUnit
        `,
      },
    });

    if (!cart || !cart.items.length) {
      throw new APIError(400, "Cart is empty");
    }

    // ======================================================
    // COMPANY BILL SUMMARY
    // ======================================================

    const comapnyBillSummary = await calculateBillSummary(cart.items);

    // ======================================================
    // TOTALS
    // ======================================================

    let subtotal = 0;

    let totalDeliveryFee = 0;

    let totalGST = 0;

    const finalItems = [];

    // ======================================================
    // LOOP ITEMS
    // ======================================================

    for (const cartItem of cart.items) {
      const variant = cartItem.variant;

      const product = variant.productId;

      const selected = items.find(
        (i) => i.variantId === variant._id.toString(),
      );

      if (!selected) continue;

      // ======================================================
      // PRODUCT TOTAL
      // ======================================================

      const itemTotal = Number(cartItem.quantity) * Number(cartItem.unitPrice);

      subtotal += itemTotal;

      // ======================================================
      // DELIVERY CALCULATION
      // ======================================================

      const result = await calculateSingleItemDeliveryFee({
        product,
        variant,
        quantity: cartItem.quantity,
        userAddress: address.location,
        deliveryType: selected.deliveryType,
      });

      totalDeliveryFee += Number(result.deliveryFee || 0);

      // ======================================================
      // GST
      // ======================================================

      const gstAmount = (itemTotal * comapnyBillSummary.taxPercentage) / 100;

      totalGST += gstAmount;

      // ======================================================
      // VENDOR AMOUNT
      // Product + vendor/self delivery
      // Logistic excluded
      // ======================================================

      let vendorAmount = itemTotal;

      if (
        selected.deliveryType === "self" ||
        selected.deliveryType === "vendor"
      ) {
        vendorAmount += Number(result.deliveryFee || 0);
      }

      // ======================================================
      // FINAL ITEM
      // ======================================================

      finalItems.push({
        productId: product._id,

        variantId: variant._id,

        productName: product.name,

        vendorId: product.vendorId,

        productImage: product.images,

        quantity: cartItem.quantity,

        unitPrice: Number(cartItem.unitPrice.toFixed(2)),

        finalPrice: Number(itemTotal.toFixed(2)),

        deliveryType: selected.deliveryType,

        durationTime: result.duration,

        distance: {
          km: Number((result.distanceKm || 0).toFixed(2)),

          meter: Number((result.distanceMeter || 0).toFixed(2)),
        },

        deliveryFee: Number((result.deliveryFee || 0).toFixed(2)),

        gstAmount: Number(gstAmount.toFixed(2)),

        vendorAmount: Number(vendorAmount.toFixed(2)),
      });
    }

    // ======================================================
    // GRAND TOTAL
    // ======================================================

    const handlingCharge = Number(comapnyBillSummary.handlingCharge || 0);

    const grandTotal = subtotal + totalDeliveryFee + totalGST + handlingCharge;

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      message: "Delivery fee calculated successfully",

      billSummary: {
        subtotal: Number(subtotal.toFixed(2)),

        deliveryFee: Number(totalDeliveryFee.toFixed(2)),

        gstAmount: Number(totalGST.toFixed(2)),

        taxPercentage: comapnyBillSummary.taxPercentage,

        handlingCharge,

        grandTotal: Number(grandTotal.toFixed(2)),
      },

      items: finalItems,
    });
  } catch (error) {
    next(error);
  }
};

// import { VendorCompany } from "../../models/vendorShop/vendor.model.js";
import logger from "../../utils/logger.js";

export const calculateSingleItemDeliveryFee = async ({
  product,
  variant,
  quantity,
  userAddress,
  deliveryType,
}) => {
  let deliveryFee = 0;
  let distanceKm = 0;
  let distanceMeter = 0;
  let duration = "";

  //  if (deliveryType === "self") {
  //     return {
  //       deliveryFee: 0,
  //       distanceKm,
  //       distanceMeter,
  //       duration,
  //     };
  //   }
  // free delivery
  // if (product.deliveryCharges === "free") {
  //   return {
  //     deliveryFee: 0,
  //     distanceKm,
  //     distanceMeter,
  //     duration,
  //   };
  // }

  const shipping = product.shippingCharges || {};

  // =========================
  // vendor company location fetch
  // =========================

  const vendorCompany = await VendorCompany.findOne({
    vendorId: product.vendorId,
  })
    .select("businessAddress")
    .lean();

  let vendorLat = null;
  let vendorLng = null;

  if (
    vendorCompany?.businessAddress?.latitude &&
    vendorCompany?.businessAddress?.longitude
  ) {
    vendorLat = vendorCompany.businessAddress.latitude;
    vendorLng = vendorCompany.businessAddress.longitude;
  }

  let userCoordinates = [userAddress.lng, userAddress.lat];

  if (
    vendorLat !== null &&
    vendorLng !== null &&
    userCoordinates.length === 2
  ) {
    const roadDistance = await getDistanceInKm(
      vendorLat,
      vendorLng,
      userCoordinates[1], // lat
      userCoordinates[0], // lng
    );

    distanceKm = roadDistance.distanceKm;
    distanceMeter = roadDistance.distanceMeter;
    duration = roadDistance.durationText || "";
  }

  // self pickup
  if (deliveryType === "self") {
    return {
      deliveryFee: 0,
      distanceKm,
      distanceMeter,
      duration,
    };
  }

  // =========================
  // free delivery
  // =========================

  if (product.deliveryCharges === "free") {
    return {
      deliveryFee: 0,
      distanceKm,
      distanceMeter,
      duration,
    };
  }
  // =========================
  // measurementUnit based logic
  // =========================

  // switch (product.measurementUnit) {
  //   case "kg":
  //     deliveryFee =
  //       Number(shipping.fixed || 0) +
  //       Number(distanceKm * (shipping.distancePerKm || 0)) +
  //       Number(
  //         (variant.packageWeight || 0) * quantity * (shipping.weightPerKg || 0),
  //       );
  //     break;

  //   case "cubicmeter":
  //     deliveryFee =
  //       Number(shipping.fixed || 0) +
  //       Number(distanceKm * (shipping.distancePerKm || 0)) +
  //       Number(quantity * (shipping.volumePerCubicMeter || 0));
  //     break;

  //   case "meter":
  //   case "supermeter":
  //     deliveryFee =
  //       Number(shipping.fixed || 0) +
  //       Number(distanceKm * (shipping.distancePerKm || 0)) +
  //       Number(quantity * (shipping.perMeterCharge || 0));
  //     break;

  //   default:
  //     deliveryFee =
  //       Number(shipping.fixed || 0) +
  //       Number(distanceKm * (shipping.distancePerKm || 0)) +
  //       Number(quantity * (shipping.perPieceCharge || 0));
  // }

  switch (product.measurementUnit) {
    case "kg":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(
          (variant.packageWeight || 0) *
            quantity *
            Number(shipping.weightPerKg || 0),
        );
      break;

    case "liter":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perLiterCharge || 0));
      break;

    case "meter":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perMeterCharge || 0));
      break;

    case "supermeter":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perSuperMeterCharge || 0));
      break;

    case "cubicmeter":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perCubicMeterCharge || 0));
      break;

    case "box":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perBoxCharge || 0));
      break;

    case "set":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perSetCharge || 0));
      break;

    case "roll":
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perRollCharge || 0));
      break;

    case "piece":
    default:
      deliveryFee =
        Number(shipping.fixed || 0) +
        Number(distanceKm * Number(shipping.distancePerKm || 0)) +
        Number(quantity * Number(shipping.perPieceCharge || 0));
      break;
  }

  return {
    deliveryFee: Math.round(deliveryFee),
    distanceKm,
    distanceMeter,
    duration,
  };
};
