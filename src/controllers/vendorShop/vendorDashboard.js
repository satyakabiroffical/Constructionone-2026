import mongoose from "mongoose";
import Order from "../../models/marketPlace/order.model.js";
import Cart from "../../models/user/cart.model.js";
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Wallet from "../../models/user/wallet.model.js";
import Transaction from "../../models/user/transaction.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import crypto from "crypto";
import redis from "../../config/redis.config.js";
import {
  sendOrderNotificationToUser,
  sendOrderNotificationToVendor,
} from "../notification.controller.js";
import { VendorCompany } from "../../models/vendorShop/vendor.model.js";
import { addSettlement } from "../vendorShop/vendorWallet.controller.js";
import vendorTransactionModel from "../../models/vendorShop/vendorTransaction.model.js";
import companyModel from "../../models/admin/company.model.js";

//latest-with all details

// export const getOrdersByVendor = async (req, res, next) => {
//   try {
//     const vendorId = req.params.vendorId;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const version = (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;
//     const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
//       req.query,
//     )}`;

//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       return res.status(200).json(JSON.parse(cached));
//     }

//     const filter = {
//       "items.vendorId": vendorId,
//       orderType: "SUB",
//     };

//     if (req.query.status) {
//       filter.status = req.query.status;
//     }

//     if (req.query.paymentStatus) {
//       filter.paymentStatus = req.query.paymentStatus;
//     }

//     const statsFilter = {
//       "items.vendorId": new mongoose.Types.ObjectId(vendorId),
//       orderType: "SUB",
//     };

//     const [orders, total, revenueResult, pendingCount] = await Promise.all([
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate({
//           path: "items.productId",
//           select: `
//     name
//     images
//     categoryId
//     pcategoryId
//     subcategoryId
//     productTypeId
//     brandId
//   `,
//           populate: [
//             {
//               path: "categoryId",
//               select: "name",
//             },
//             {
//               path: "pcategoryId",
//               select: "name",
//             },
//             {
//               path: "subcategoryId",
//               select: "name",
//             },
//             {
//               path: "productTypeId",
//               select: "typeName",
//             },
//             {
//               path: "brandId",
//               select: "name",
//             },
//           ],
//         })
//         .populate({
//           path: "items.variantId",
//           select: "price packageWeight packageDimensions",
//         })
//         .populate({
//           path: "userId",
//           select: "name email phone",
//         })
//         .populate({
//           path: "shippingAddressId",
//           select:
//             "label userName addressLine country city state pincode landMark",
//         })
//         .lean(),

//       Order.countDocuments(filter),

//       Order.aggregate([
//         {
//           $match: {
//             ...statsFilter,
//             paymentStatus: "PAID",
//             status: "DELIVERED",
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             totalRevenue: {
//               $sum: "$netAmount",
//             },
//           },
//         },
//       ]),

//       Order.countDocuments({
//         ...statsFilter,
//         status: "PENDING",
//       }),
//     ]);

//     const totalRevenue = revenueResult[0]?.totalRevenue || 0;

//     const response = {
//       success: true,
//       message: "Vendor orders fetched successfully",
//       stats: {
//         totalRevenue,
//         pendingCount,
//       },
//       data: {
//         orders,
//         pagination: {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//     };
//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

//get single order with details

export const getOrderByIdForVendor = async (req, res, next) => {
  try {
    const vendorId = req.user.id || "699c16b0e4bbd8cf25acc76b";
    const orderId = req.params.orderId;

    // const version = (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;

    // const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
    //   req.query,
    // )}`;

    // const cached = await redis.get(cacheKey);
    // if (cached) {
    //   return res.status(200).json(JSON.parse(cached));
    // }

    const filter = {
      _id: new mongoose.Types.ObjectId(orderId),
      orderType: "SUB",
      "items.vendorId": new mongoose.Types.ObjectId(vendorId),
    };

    const [orders] = await Promise.all([
      Order.find(filter)
        .populate({
          path: "items.productId",
          select: `
    name
    images
    leadTime
    categoryId
    pcategoryId
    subcategoryId
    productTypeId
    brandId
  `,
          populate: [
            {
              path: "categoryId",
              select: "name",
            },
            {
              path: "pcategoryId",
              select: "name",
            },
            {
              path: "subcategoryId",
              select: "name",
            },
            {
              path: "productTypeId",
              select: "typeName",
            },
            {
              path: "brandId",
              select: "name",
            },
          ],
        })
        .populate({
          path: "items.variantId",
          select: "price packageWeight packageDimensions sold quantity",
        })
        .populate({
          path: "userId",
          select: "name email phone",
        })
        .populate({
          path: "shippingAddressId",
          select:
            "label userName addressLine country city state pincode landMark",
        })
        .lean(),
    ]);

    const vendorIds = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const vId = item.vendorId?._id?.toString() || item.vendorId?.toString();
        if (vId) vendorIds.push(vId);
      });
    });

    const vendorCompanies = await VendorCompany.find({
      vendorId: { $in: vendorIds },
    })
      .select(
        `
    companyName
    companyType
    businessAddress
    contactNumber
    companyRegistrationNumber
    gstNumber
    vendorId
  `,
      )
      .lean();

    const companyMap = {};

    vendorCompanies.forEach((company) => {
      companyMap[company.vendorId.toString()] = company;
    });

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const vId = item.vendorId?._id?.toString() || item.vendorId?.toString();
        item.vendorCompany = companyMap[vId] || null;
      });
    });

    const response = {
      success: true,
      message: "Vendor orders fetched successfully",
      data: {
        orders,
      },
    };
    // await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get all orders for vendor screen
// export const getAllOrdersForVendor = async (req, res, next) => {
//   try {
//     const vendorId = req.user.id;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const search = req.query.search?.trim() || "";

//     const version = (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;

//     const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
//       req.query,
//     )}`;

//     // const cached = await redis.get(cacheKey);
//     // if (cached) {
//     //   return res.status(200).json(JSON.parse(cached));
//     // }

//     // base filter
//     const filter = {
//       "items.vendorId": vendorId,
//       orderType: "SUB",
//     };

//     if (req.query.status) {
//       filter.status = req.query.status;
//     }

//     if (req.query.paymentStatus) {
//       filter.paymentStatus = req.query.paymentStatus;
//     }

//     // search filter
//     if (search) {
//       filter.$or = [
//         {
//           orderId: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//         {
//           "items.productName": {
//             $regex: search,
//             $options: "i",
//           },
//         },
//         {
//           status: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//       ];
//     }

//     const allStatusesFromModel = Order.schema.path("status").enumValues || [];
//     const allStatuses = ["ALL", ...allStatusesFromModel];

//     const [orders, total] = await Promise.all([
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select(
//           `
//             orderId
//             status
//             paymentStatus
//             netAmount
//             createdAt
//             items
//             userId
//           `,
//         )
//         .populate({
//           path: "items.productId",
//           select: "name images",
//         })
//         .populate({
//           path: "userId",
//           select: "name phone",
//         })
//         .lean(),
//     ]);

//     const formattedOrders = orders.map((order) => ({
//       _id: order._id,
//       orderId: order.orderId,
//       status: order.status,
//       paymentStatus: order.paymentStatus,
//       totalAmount: order.netAmount,
//       createdAt: order.createdAt,
//       deliveryType: order.items?.[0]?.deliveryType || "",

//       customer: {
//         name: order.userId?.name || "",
//         phone: order.userId?.phone || "",
//       },

//       totalItems: order.items?.length || 0,

//       products:
//         order.items?.slice(0, 2).map((item) => ({
//           productName: item.productId?.name || item.productName,
//           image: item.productId?.images?.[0] || "",
//           quantity: item.quantity,
//           deliveryType: item.deliveryType || "",
//         })) || [],
//     }));

//     const response = {
//       success: true,
//       message: "Vendor orders fetched successfully",

//       filters: {
//         statuses: allStatuses || [],
//       },

//       data: {
//         orders: formattedOrders,
//         pagination: {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//     };

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

// export const getAllOrdersForVendor = async (req, res, next) => {
//   try {
//     const vendorId = req.user.id;

//     const page = parseInt(req.query.page) || 1;

//     const limit = parseInt(req.query.limit) || 10;

//     const skip = (page - 1) * limit;

//     const search = req.query.search?.trim() || "";

//     // ======================================================
//     // CACHE
//     // ======================================================

//     const version = (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;

//     const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
//       req.query,
//     )}`;

//     // const cached = await redis.get(cacheKey);

//     // if (cached) {
//     //   return res.status(200).json(JSON.parse(cached));
//     // }

//     // ======================================================
//     // FILTER
//     // ======================================================

//     const filter = {
//       "items.vendorId": vendorId,
//       orderType: "SUB",
//     };

//     if (req.query.status) {
//       filter.status = req.query.status;
//     }

//     if (req.query.paymentStatus) {
//       filter.paymentStatus = req.query.paymentStatus;
//     }

//     // ======================================================
//     // SEARCH
//     // ======================================================

//     if (search) {
//       filter.$or = [
//         {
//           orderId: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//         {
//           "items.productName": {
//             $regex: search,
//             $options: "i",
//           },
//         },
//         {
//           status: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//       ];
//     }

//     // ======================================================
//     // STATUS FILTERS
//     // ======================================================

//     const allStatusesFromModel = Order.schema.path("status").enumValues || [];

//     const allStatuses = ["ALL", ...allStatusesFromModel];

//     // ======================================================
//     // FETCH ORDERS
//     // ======================================================

//     const [orders, total] = await Promise.all([
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select(
//           `
//           orderId
//           status
//           paymentStatus
//           netAmount
//           subTotal
//           totalDeliveryFee
//           handlingCharge
//           createdAt
//           items
//           userId
//         `,
//         )
//         .populate({
//           path: "items.productId",
//           select: `
//             name
//             images
//             measurementUnit
//           `,
//         })
//         .populate({
//           path: "items.variantId",
//           select: `
//             size
//           `,
//         })
//         .populate({
//           path: "userId",
//           select: "name phone",
//         })
//         .lean(),

//       Order.countDocuments(filter),
//     ]);

//     // ======================================================
//     // FORMAT ORDERS
//     // ======================================================

//     const formattedOrders = orders.map((order) => {
//       // ==================================================
//       // FILTER VENDOR ITEMS
//       // ==================================================

//       const vendorItems =
//         order.items?.filter(
//           (item) => item.vendorId?.toString() === vendorId.toString(),
//         ) || [];

//       // ==================================================
//       // CALCULATIONS
//       // ==================================================

//       const totalBill = vendorItems.reduce((sum, item) => {
//         return (
//           sum + (item.finalPrice || item.price || 0) * (item.quantity || 0)
//         );
//       }, 0);

//       const totalDeliveryCharge = vendorItems.reduce((sum, item) => {
//         return sum + (item.deliveryFee || 0);
//       }, 0);

//       const totalVendorAmount = vendorItems.reduce((sum, item) => {
//         return sum + (item.vendorAmount || 0);
//       }, 0);

//       const totalGST = vendorItems.reduce((sum, item) => {
//         return sum + (item.gstAmount || 0);
//       }, 0);

//       // ==================================================
//       // RESPONSE
//       // ==================================================

//       return {
//         _id: order._id,

//         orderId: order.orderId,

//         status: order.status,

//         paymentStatus: order.paymentStatus,

//         createdAt: order.createdAt,

//         itemCount: vendorItems.length,

//         customer: {
//           name: order.userId?.name || "",

//           phone: order.userId?.phone || "",
//         },

//         // ================================================
//         // ORDER DETAILS
//         // ================================================

//         orderDetails: vendorItems.map((item) => ({
//           productId: item.productId?._id || "",

//           variantId: item.variantId?._id || "",

//           productName: item.productId?.name || "",

//           image: item.productId?.images?.[0] || "",

//           quantity: item.quantity || 0,

//           measurementUnit: item.productId?.measurementUnit || "",

//           size: item.variantId?.size || "",

//           price: item.price || 0,

//           finalPrice: item.finalPrice || 0,

//           gstAmount: item.gstAmount || 0,

//           deliveryFee: item.deliveryFee || 0,

//           vendorAmount: item.vendorAmount || 0,

//           packageWeight: item.packageWeight || 0,

//           deliveryType: item.deliveryType || "",

//           status: item.status || "",

//           total:
//             (item.finalPrice || item.price || 0) * (item.quantity || 0) +
//               item.gstAmount || 0,
//         })),

//         // ================================================
//         // BILL SUMMARY
//         // ================================================

//         billSummary: {
//           totalBill,

//           totalDeliveryCharge,

//           gst: totalGST,

//           handlingCharge: order.handlingCharge || 0,

//           vendorAmount: totalVendorAmount,

//           totalAmount:
//             totalBill +
//             totalDeliveryCharge +
//             totalGST +
//             (order.handlingCharge || 0),
//         },
//       };
//     });

//     // ======================================================
//     // FINAL RESPONSE
//     // ======================================================

//     const response = {
//       success: true,

//       message: "Vendor orders fetched successfully",

//       filters: {
//         statuses: allStatuses || [],
//       },

//       data: {
//         orders: formattedOrders,

//         pagination: {
//           total,

//           page,

//           limit,

//           totalPages: Math.ceil(total / limit),
//         },
//       },
//     };

//     // ======================================================
//     // CACHE SAVE
//     // ======================================================

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

export const getAllOrdersForVendor = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";

    // ======================================================
    // CACHE
    // ======================================================

    // const version =
    //   (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;

    // const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
    //   req.query,
    // )}`;

    // const cached = await redis.get(cacheKey);

    // if (cached) {
    //   return res.status(200).json(JSON.parse(cached));
    // }

    // ======================================================
    // STATUS ENUMS
    // ======================================================

    const allStatusesFromModel = Order.schema.path("status").enumValues || [];

    const allStatuses = ["ALL", ...allStatusesFromModel];

    // ======================================================
    // FILTER
    // ======================================================

    const filter = {
      "items.vendorId": vendorId,
      orderType: "SUB",
      paymentStatus: "PAID",
    };

    // status filter
    if (
      req.query.status &&
      req.query.status !== "ALL" &&
      allStatusesFromModel.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    // payment status filter
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // ======================================================
    // SEARCH
    // ======================================================

    if (search) {
      filter.$or = [
        {
          orderId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "userId.name": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // ======================================================
    // FETCH ORDERS
    // ======================================================

    const [orders, total] = await Promise.all([
      Order.find(filter)
        // recent orders top pe
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          `
          orderId
          status
          paymentStatus
          netAmount
          subTotal
          totalDeliveryFee
          handlingCharge
          createdAt
          items
          userId
        `,
        )
        .populate({
          path: "items.productId",
          select: `
            name
            images
            measurementUnit
          `,
        })
        .populate({
          path: "items.variantId",
          select: `
            size
          `,
        })
        .populate({
          path: "userId",
          select: "name phone",
          match: search
            ? {
                name: {
                  $regex: search,
                  $options: "i",
                },
              }
            : {},
        })
        .lean(),

      Order.countDocuments(filter),
    ]);

    // ======================================================
    // REMOVE NULL USERS AFTER SEARCH
    // ======================================================

    const filteredOrders = search
      ? orders.filter(
          (order) =>
            order.orderId?.toLowerCase().includes(search.toLowerCase()) ||
            order.userId,
        )
      : orders;

    // ======================================================
    // FORMAT ORDERS
    // ======================================================

    const formattedOrders = filteredOrders.map((order) => {
      // ==================================================
      // FILTER VENDOR ITEMS
      // ==================================================

      const vendorItems =
        order.items?.filter(
          (item) => item.vendorId?.toString() === vendorId.toString(),
        ) || [];

      // ==================================================
      // CALCULATIONS
      // ==================================================

      const totalBill = vendorItems.reduce((sum, item) => {
        return (
          sum + (item.finalPrice || item.price || 0) * (item.quantity || 0)
        );
      }, 0);

      const totalDeliveryCharge = vendorItems.reduce((sum, item) => {
        return sum + (item.deliveryFee || 0);
      }, 0);

      const totalVendorAmount = vendorItems.reduce((sum, item) => {
        return sum + (item.vendorAmount || 0);
      }, 0);

      const totalGST = vendorItems.reduce((sum, item) => {
        return sum + (item.gstAmount || 0);
      }, 0);

      // ==================================================
      // RESPONSE
      // ==================================================

      return {
        _id: order._id,

        orderId: order.orderId,

        status: order.status,

        paymentStatus: order.paymentStatus,

        createdAt: order.createdAt,

        itemCount: vendorItems.length,

        customer: {
          name: order.userId?.name || "",

          phone: order.userId?.phone || "",
        },

        // ================================================
        // ORDER DETAILS
        // ================================================

        orderDetails: vendorItems.map((item) => ({
          productId: item.productId?._id || "",

          variantId: item.variantId?._id || "",

          productName: item.productId?.name || "",

          image: item.productId?.images?.[0] || "",

          quantity: item.quantity || 0,

          measurementUnit: item.productId?.measurementUnit || "",

          size: item.variantId?.size || "",

          price: item.price || 0,

          finalPrice: item.finalPrice || 0,

          gstAmount: item.gstAmount || 0,

          deliveryFee: item.deliveryFee || 0,

          vendorAmount: item.vendorAmount || 0,

          packageWeight: item.packageWeight || 0,

          deliveryType: item.deliveryType || "",

          status: item.status || "",

          total:
            (item.finalPrice || item.price || 0) * (item.quantity || 0) +
            (item.gstAmount || 0),
        })),

        // ================================================
        // BILL SUMMARY
        // ================================================

        billSummary: {
          totalBill,

          totalDeliveryCharge,

          gst: totalGST,

          handlingCharge: order.handlingCharge || 0,

          vendorAmount: totalVendorAmount,

          totalAmount:
            totalBill +
            totalDeliveryCharge +
            totalGST +
            (order.handlingCharge || 0),
        },
      };
    });

    // ======================================================
    // FINAL RESPONSE
    // ======================================================

    const response = {
      success: true,

      message: "Vendor orders fetched successfully",

      filters: {
        statuses: allStatuses,
      },

      data: {
        orders: formattedOrders,

        pagination: {
          total: search ? filteredOrders.length : total,

          page,

          limit,

          totalPages: Math.ceil(
            (search ? filteredOrders.length : total) / limit,
          ),
        },
      },
    };

    // ======================================================
    // CACHE SAVE
    // ======================================================

    // await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//dashboard-overview
export const getVendorOverview = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    let { date } = req.query;

    if (!date) {
      const today = new Date();
      date = today.toISOString().split("T")[0];
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const baseMatch = {
      "items.vendorId": vendorObjectId,
      orderType: "SUB",
    };

    const dateFilter = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    // 1. Total Earnings
    const earningsRes = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...dateFilter,
          paymentStatus: "PAID",
          status: "DELIVERED",
        },
      },
      { $group: { _id: null, totalEarnings: { $sum: "$netAmount" } } },
    ]);

    // 2. Pending Orders
    const pendingRes = await Order.aggregate([
      { $match: { ...baseMatch, ...dateFilter, status: "ACCEPTED" } },
      { $count: "count" },
    ]);

    const newOrdersRes = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...dateFilter,
          status: "PENDING",
        },
      },
      { $count: "count" },
    ]);

    // 3. Total Orders on selected date
    const totalOrdersRes = await Order.aggregate([
      { $match: { ...baseMatch, ...dateFilter } },
      { $count: "count" },
    ]);

    // 4. Total Unique Products (overall)
    const productsRes = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      { $group: { _id: "$items.productId" } },
      { $count: "count" },
    ]);

    // 5. Recent Orders
    const recentOrders = await Order.find({ ...baseMatch, ...dateFilter })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.productId", "name images")
      .populate(
        "items.variantId",
        "price size packageWeight packageDimensions stock sold",
      )
      .populate("userId", "name")
      .lean();

    // 6. Low Stock Variants (Fixed - ab Variant mein vendorId ki zarurat nahi)
    const lowStock = await Order.aggregate([
      { $match: baseMatch }, // is vendor ke saare orders
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "variants", // apna Variant collection ka naam yahan daalo (agar alag hai to change karo)
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },
      { $match: { "variant.stock": { $lt: 10 } } }, // stock < 10
      {
        $group: {
          _id: "$items.variantId",
          productId: { $first: "$items.productId" },
          variant: { $first: "$variant" },
        },
      },
      { $sort: { "variant.stock": 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: "$product._id",
          productName: "$product.name",
          productImage: { $arrayElemAt: ["$product.images", 0] },
          variantId: "$_id",
          size: "$variant.size",
          packageWeight: "$variant.packageWeight",
          stock: "$variant.stock",
          sold: "$variant.sold",
        },
      },
    ]);

    // 7. Popular Products (selected date)
    const popularRes = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...dateFilter,
          status: { $in: ["DELIVERED", "CONFIRMED"] },
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $group: {
          _id: "$items.productId",
          soldCount: { $sum: "$items.quantity" },
          totalSalesValue: {
            $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
          },
        },
      },
      { $sort: { soldCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: "$_id",
          productName: "$product.name",
          productImage: { $arrayElemAt: ["$product.images", 0] },
          soldCount: 1,
          totalSalesValue: 1,
        },
      },
    ]);
    const response = {
      success: true,
      message: "Vendor overview fetched successfully",
      selectedDate: date,
      data: {
        totalEarnings: earningsRes[0]?.totalEarnings || 0,
        pendingOrders: pendingRes[0]?.count || 0, // ACCEPTED
        newOrders: newOrdersRes[0]?.count || 0, // PENDING
        todayOrders: totalOrdersRes[0]?.count || 0,
        totalProducts: productsRes[0]?.count || 0,

        recentOrders: recentOrders || [],
        lowStockVariants: lowStock || [],
        popularProducts: popularRes || [],
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    // console.error("Vendor Overview Error:", error);
    next(error);
  }
};

//accept order and updates all order status
export const vendorUpdateOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user.id;

    // console.log("vendorId-middleware", vendorId);
    const { subOrderId } = req.params;
    const { action, reason } = req.body;

    const allowedActions = [
      "ACCEPT",
      "REJECT",
      "READY_FOR_SHIP",
      "SHIP",
      "DELIVER",
    ];

    if (!allowedActions.includes(action)) {
      throw new APIError(400, "Invalid action");
    }

    const subOrder = await Order.findOne({
      _id: subOrderId,
      orderType: "SUB",
    }).session(session);

    if (!subOrder) throw new APIError(404, "Sub order not found");

    // // vendor check
    const isValidVendor = subOrder.items.some(
      (item) => item.vendorId.toString() === vendorId.toString(),
    );

    if (!isValidVendor) {
      throw new APIError(
        403,
        "You do not have permission to update this order",
      );
    }

    const currentStatus = subOrder.items[0].status;

    const validTransitions = {
      PENDING: ["ACCEPT", "REJECT"],
      ACCEPTED: ["READY_FOR_SHIP"],
      PACKED: ["SHIP"],
      SHIPPED: ["DELIVER"],
    };

    if (!validTransitions[currentStatus]?.includes(action)) {
      throw new APIError(
        400,
        `Cannot ${action} when status is ${currentStatus}`,
      );
    }

    const actionMap = {
      ACCEPT: { item: "ACCEPTED", order: "CONFIRMED" },
      REJECT: { item: "CANCELLED", order: "CANCELLED" },
      READY_FOR_SHIP: { item: "PACKED", order: "PROCESSING" },
      SHIP: { item: "SHIPPED", order: "OUT_FOR_DELIVERY" },
      DELIVER: { item: "DELIVERED", order: "DELIVERED" },
    };

    const { item: itemStatus, order: orderStatus } = actionMap[action];

    //  SELF delivery check
    // if (action === "SHIP") {
    //   const isSelf = subOrder.items.some((i) => i.deliveryType === "self");

    //   if (!isSelf) {
    //     throw new APIError(
    //       400,
    //       "Only SELF delivery orders can be shipped by vendor",
    //     );
    //   }
    // }

    await Order.updateOne(
      { _id: subOrder._id },
      {
        $set: {
          status: orderStatus,
          reason: reason || null,
          cancleBy: action === "REJECT" ? "VENDOR" : null,
          "items.$[].status": itemStatus,
        },
      },
      { session },
    );

    if (action === "REJECT") {
      const variantOps = subOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.variantId },
          update: { $inc: { stock: item.quantity, sold: -item.quantity } },
        },
      }));

      if (variantOps.length) {
        await Variant.bulkWrite(variantOps, { session });
      }
    }

    const subOrders = await Order.find({
      parentId: subOrder.parentId,
      orderType: "SUB",
    }).session(session);

    let masterStatus = "PROCESSING";

    if (subOrders.every((o) => o.status === "DELIVERED")) {
      masterStatus = "DELIVERED";

      // for (const sub of subOrders) {
      //   const vendorId = sub.items[0].vendorId;
      //   const alreadySettled = await vendorTransactionModel
      //     .findOne({
      //       orderId: sub._id,
      //       type: "ORDER_SETTLEMENT",
      //     })
      //     .session(session);

      //   if (!alreadySettled) {
      //     await addSettlement(vendorId, sub._id, sub.netAmount, session);
      //   }
      // }

      // for (const sub of subOrders) {
      //   const vendorId = sub.items[0].vendorId;

      //   const alreadySettled = await vendorTransactionModel
      //     .findOne({
      //       orderId: sub._id,
      //       type: "ORDER_SETTLEMENT",
      //     })
      //     .session(session);

      //   if (!alreadySettled) {
      //     const vendorTotal = sub.items.reduce((sum, item) => {
      //       return sum + (item.vendorAmount || 0);
      //     }, 0);

      //     await addSettlement(vendorId, sub._id, vendorTotal, session);
      //   }
      // }

      for (const sub of subOrders) {
        // ======================================================
        // GROUP ITEMS BY VENDOR
        // ======================================================

        const vendorMap = {};

        for (const item of sub.items) {
          const vendorId = item.vendorId.toString();

          if (!vendorMap[vendorId]) {
            vendorMap[vendorId] = 0;
          }

          vendorMap[vendorId] += item.vendorAmount || 58;
        }

        // ======================================================
        // CREATE SETTLEMENT FOR EACH VENDOR
        // ======================================================

        for (const [vendorId, vendorTotal] of Object.entries(vendorMap)) {
          const alreadySettled = await vendorTransactionModel
            .findOne({
              orderId: sub._id,
              vendorId,
              type: "ORDER_SETTLEMENT",
            })
            .session(session);

          if (!alreadySettled) {
            await addSettlement(vendorId, sub._id, vendorTotal, session);
          }
        }
      }
    } else if (subOrders.some((o) => o.status === "OUT_FOR_DELIVERY")) {
      masterStatus = "OUT_FOR_DELIVERY";
    } else if (subOrders.some((o) => o.status === "CONFIRMED")) {
      masterStatus = "CONFIRMED";
    }

    await Order.updateOne(
      { _id: subOrder.parentId },
      { $set: { status: masterStatus } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    await redis.incr(`vendor:orders:version:${vendorId}`);

    return res.status(200).json({
      success: true,
      message: `${action} successful`,
      itemStatus,
      orderStatus,
      masterStatus,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// if (action === "ACCEPT") {
//   const subOrders = await Order.find({
//     parentId: subOrder.parentId,
//     orderType: "SUB",
//   }).session(session);

//   const allAccepted = subOrders.every(
//     (o) => o.status === "CONFIRMED"
//   );

//   if (allAccepted) {
//     const masterOrder = await Order.findById(subOrder.parentId).session(session);

//     await generateOrderInvoices(masterOrder, subOrders);
//   }
// }
