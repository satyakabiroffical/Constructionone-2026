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
import redisCache from "../../utils/redisCache.js";
import rfqModel from "../../models/vendorShop/rfq.model.js";
import vendorWalletModel from "../../models/vendorShop/vendorWallet.model.js";
import RedisCache from "../../utils/redisCache.js";

const getItemStatusProgress = (itemStatus, updatedAt) => {
  const statusMapping = {
    PENDING: "PENDING",
    ACCEPTED: "CONFIRMED",
    PACKED: "PROCESSING",
    SHIPPED: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "PENDING",
  };

  const effectiveStatus = statusMapping[itemStatus] || "PENDING";
  const currentIndex = getStatusIndex(effectiveStatus);

  const sequence = [
    { key: "PENDING", label: "Order Placed", icon: "📝" },
    { key: "CONFIRMED", label: "Order Confirmed", icon: "✅" },
    { key: "PROCESSING", label: "Processing", icon: "🔄" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🚚" },
    { key: "DELIVERED", label: "Delivered", icon: "🎉" },
  ];

  return sequence.map((step, index) => ({
    status: step.key,
    label: step.label,
    icon: step.icon,
    isCompleted: index < currentIndex,
    isCurrent: index === currentIndex,
    updatedAt: updatedAt,
  }));
};

const getStatusIndex = (status) => {
  const orderList = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ];
  return orderList.indexOf(status);
};

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
    measurementUnit
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

//     // const version =
//     //   (await redis.get(`vendor:orders:version:${vendorId}`)) || 1;

//     // const cacheKey = `orders:vendor:${vendorId}:v${version}:${JSON.stringify(
//     //   req.query,
//     // )}`;

//     // const cached = await redis.get(cacheKey);

//     // if (cached) {
//     //   return res.status(200).json(JSON.parse(cached));
//     // }

//     // ======================================================
//     // STATUS ENUMS
//     // ======================================================

//     const allStatusesFromModel = Order.schema.path("status").enumValues || [];

//     const allStatuses = ["ALL", ...allStatusesFromModel];

//     // ======================================================
//     // FILTER
//     // ======================================================

//     const filter = {
//       "items.vendorId": vendorId,
//       orderType: "SUB",
//       paymentStatus: "PAID",
//     };

//     // status filter
//     if (
//       req.query.status &&
//       req.query.status !== "ALL" &&
//       allStatusesFromModel.includes(req.query.status)
//     ) {
//       filter.status = req.query.status;
//     }

//     // payment status filter
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
//           "userId.name": {
//             $regex: search,
//             $options: "i",
//           },
//         },
//       ];
//     }

//     // ======================================================
//     // FETCH ORDERS
//     // ======================================================

//     const [orders, total] = await Promise.all([
//       Order.find(filter)
//         // recent orders top pe
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
//           match: search
//             ? {
//                 name: {
//                   $regex: search,
//                   $options: "i",
//                 },
//               }
//             : {},
//         })
//         .lean(),

//       Order.countDocuments(filter),
//     ]);

//     // ======================================================
//     // REMOVE NULL USERS AFTER SEARCH
//     // ======================================================

//     const filteredOrders = search
//       ? orders.filter(
//           (order) =>
//             order.orderId?.toLowerCase().includes(search.toLowerCase()) ||
//             order.userId,
//         )
//       : orders;

//     // ======================================================
//     // FORMAT ORDERS
//     // ======================================================

//     const formattedOrders = filteredOrders.map((order) => {
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

//           // total:
//           //   (item.finalPrice || item.price || 0) * (item.quantity || 0) +
//           //   (item.gstAmount || 0),
//           total: Number(
//             (
//               (item.finalPrice || item.price || 0) * (item.quantity || 0) +
//               (item.gstAmount || 0)
//             ).toFixed(2),
//           ),
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

//           totalAmount: Number(
//             (
//               totalBill +
//               totalDeliveryCharge +
//               totalGST +
//               (order.handlingCharge || 0)
//             ).toFixed(2),
//           ),
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
//         statuses: allStatuses,
//       },

//       data: {
//         orders: formattedOrders,

//         pagination: {
//           total: search ? filteredOrders.length : total,

//           page,

//           limit,

//           totalPages: Math.ceil(
//             (search ? filteredOrders.length : total) / limit,
//           ),
//         },
//       },
//     };

//     // ======================================================
//     // CACHE SAVE
//     // ======================================================

//     // await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };
//dashboard-overview

export const getAllOrdersForVendor = async (req, res, next) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);

    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      orderType,
      paymentStatus,
      startDate,
      endDate,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // ======================================================
    // BASE MATCH
    // ======================================================

    const match = {
      "items.vendorId": vendorId,
    };

    // item level status filter
    if (status && status !== "ALL") {
      match["items.status"] = status;
    }

    // payment status
    if (paymentStatus) {
      match.paymentStatus = paymentStatus;
    }

    // order type
    if (orderType) {
      match.orderType = orderType;
    }

    // date range
    if (startDate || endDate) {
      match.createdAt = {};

      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        match.createdAt.$lte = end;
      }
    }

    // ======================================================
    // PIPELINE
    // ======================================================

    const pipeline = [
      {
        $match: match,
      },

      // ======================================================
      // USER LOOKUP
      // ======================================================

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ======================================================
      // SEARCH
      // ======================================================

      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    orderId: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    "user.name": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    "user.phone": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),

      // ======================================================
      // FACET
      // ======================================================

      {
        $facet: {
          // ======================================================
          // ORDERS
          // ======================================================

          orders: [
            {
              $sort: {
                createdAt: -1,
              },
            },

            {
              $skip: skip,
            },

            {
              $limit: limitNumber,
            },

            {
              $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "products",
              },
            },

            {
              $lookup: {
                from: "variants",
                localField: "items.variantId",
                foreignField: "_id",
                as: "variants",
              },
            },

            {
              $project: {
                orderId: 1,
                orderType: 1,
                status: 1,
                paymentStatus: 1,
                handlingCharge: 1,
                createdAt: 1,

                customer: {
                  name: "$user.name",
                  phone: "$user.phone",
                },

                items: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$items",
                        as: "item",
                        cond: {
                          $eq: ["$$item.vendorId", vendorId],
                        },
                      },
                    },

                    as: "item",

                    in: {
                      productId: "$$item.productId",

                      variantId: "$$item.variantId",

                      vendorId: "$$item.vendorId",

                      quantity: "$$item.quantity",

                      price: {
                        $round: [
                          {
                            $ifNull: ["$$item.price", 0],
                          },
                          2,
                        ],
                      },

                      finalPrice: {
                        $round: [
                          {
                            $ifNull: ["$$item.finalPrice", 0],
                          },
                          2,
                        ],
                      },

                      gstAmount: {
                        $round: [
                          {
                            $ifNull: ["$$item.gstAmount", 0],
                          },
                          2,
                        ],
                      },

                      deliveryFee: {
                        $round: [
                          {
                            $ifNull: ["$$item.deliveryFee", 0],
                          },
                          2,
                        ],
                      },

                      vendorAmount: {
                        $round: [
                          {
                            $ifNull: ["$$item.vendorAmount", 0],
                          },
                          2,
                        ],
                      },

                      packageWeight: "$$item.packageWeight",

                      deliveryType: "$$item.deliveryType",

                      status: "$$item.status",

                      durationTime: "$$item.durationTime",

                      distance: "$$item.distance",

                      statusProgress: "$$item.statusProgress",

                      product: {
                        $let: {
                          vars: {
                            product: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$products",
                                    as: "p",
                                    cond: {
                                      $eq: [
                                        "$$p._id",
                                        "$$item.productId",
                                      ],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },

                          in: {
                            _id: "$$product._id",
                            name: "$$product.name",
                            images: "$$product.images",
                            measurementUnit:
                              "$$product.measurementUnit",
                          },
                        },
                      },

                      variant: {
                        $let: {
                          vars: {
                            variant: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$variants",
                                    as: "v",
                                    cond: {
                                      $eq: [
                                        "$$v._id",
                                        "$$item.variantId",
                                      ],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },

                          in: {
                            _id: "$$variant._id",
                            size: "$$variant.size",
                          },
                        },
                      },

                      total: {
                        $round: [
                          {
                            $add: [
                              {
                                $multiply: [
                                  {
                                    $ifNull: [
                                      "$$item.finalPrice",
                                      0,
                                    ],
                                  },
                                  {
                                    $ifNull: [
                                      "$$item.quantity",
                                      0,
                                    ],
                                  },
                                ],
                              },
                              {
                                $ifNull: [
                                  "$$item.gstAmount",
                                  0,
                                ],
                              },
                              {
                                $ifNull: [
                                  "$$item.deliveryFee",
                                  0,
                                ],
                              },
                            ],
                          },
                          2,
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],

          // ======================================================
          // STATS
          // ======================================================

          stats: [
            {
              $unwind: "$items",
            },

            {
              $match: {
                "items.vendorId": vendorId,
              },
            },

            // ======================================================
            // ITEM TOTAL + DELAYED
            // ======================================================

            {
              $addFields: {
                itemTotal: {
                  $round: [
                    {
                      $add: [
                        {
                          $multiply: [
                            {
                              $ifNull: [
                                "$items.finalPrice",
                                0,
                              ],
                            },
                            {
                              $ifNull: [
                                "$items.quantity",
                                0,
                              ],
                            },
                          ],
                        },
                        {
                          $ifNull: [
                            "$items.gstAmount",
                            0,
                          ],
                        },
                        {
                          $ifNull: [
                            "$items.deliveryFee",
                            0,
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },

                // isDelayed: {
                //   $cond: [
                //     {
                //       $and: [
                //         {
                //           $lt: [
                //             "$createdAt",
                //             new Date(
                //               Date.now() -
                //                 3 * 24 * 60 * 60 * 1000,
                //             ),
                //           ],
                //         },

                //         {
                //           $not: {
                //             $in: [
                //               "$items.status",
                //               [
                //                 "DELIVERED",
                //                 "CANCELLED",
                //               ],
                //             ],
                //           },
                //         },
                //       ],
                //     },
                //     true,
                //     false,
                //   ],
                // },

                isDelayed: {
  $switch: {
    branches: [
      {
        case: {
          $and: [
            {
              $eq: ["$items.status", "PENDING"],
            },
            {
              $lt: [
                "$createdAt",
                new Date(
                  Date.now() -
                    1 * 24 * 60 * 60 * 1000,
                ),
              ],
            },
          ],
        },
        then: true,
      },

      {
        case: {
          $and: [
            {
              $eq: [
                "$items.status",
                "CONFIRMED",
              ],
            },
            {
              $lt: [
                "$createdAt",
                new Date(
                  Date.now() -
                    2 * 24 * 60 * 60 * 1000,
                ),
              ],
            },
          ],
        },
        then: true,
      },

      {
        case: {
          $and: [
            {
              $eq: [
                "$items.status",
                "PROCESSING",
              ],
            },
            {
              $lt: [
                "$createdAt",
                new Date(
                  Date.now() -
                    3 * 24 * 60 * 60 * 1000,
                ),
              ],
            },
          ],
        },
        then: true,
      },

      {
        case: {
          $and: [
            {
              $in: [
                "$items.status",
                [
                  "SHIPPED",
                  "OUT_FOR_DELIVERY",
                ],
              ],
            },
            {
              $lt: [
                "$createdAt",
                new Date(
                  Date.now() -
                    5 * 24 * 60 * 60 * 1000,
                ),
              ],
            },
          ],
        },
        then: true,
      },
    ],

    default: false,
  },
},

              },
            },

            // ======================================================
            // GROUP
            // ======================================================

            {
              $group: {
                _id: null,

                total: {
                  $sum: 1,
                },

                newOrders: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "PENDING",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                confirmed: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "CONFIRMED",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                processing: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "PROCESSING",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                dispatched: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$items.status",
                          [
                            "SHIPPED",
                            "OUT_FOR_DELIVERY",
                          ],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                delivered: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "DELIVERED",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                cancelled: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "CANCELLED",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                delayed: {
                  $sum: {
                    $cond: ["$isDelayed", 1, 0],
                  },
                },

                // ================================================
                // AMOUNTS
                // ================================================

                newAmount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "PENDING",
                        ],
                      },
                      "$itemTotal",
                      0,
                    ],
                  },
                },

                pendingDispatchAmount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$items.status",
                          [
                            "PENDING",
                            "CONFIRMED",
                            "PROCESSING",
                          ],
                        ],
                      },
                      "$itemTotal",
                      0,
                    ],
                  },
                },

                dispatchedAmount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$items.status",
                          [
                            "SHIPPED",
                            "OUT_FOR_DELIVERY",
                          ],
                        ],
                      },
                      "$itemTotal",
                      0,
                    ],
                  },
                },

                deliveredAmount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$items.status",
                          "DELIVERED",
                        ],
                      },
                      "$itemTotal",
                      0,
                    ],
                  },
                },

                delayedAmount: {
                  $sum: {
                    $cond: [
                      "$isDelayed",
                      "$itemTotal",
                      0,
                    ],
                  },
                },
              },
            },

            // ======================================================
            // ROUND VALUES
            // ======================================================

            {
              $project: {
                _id: 0,

                total: 1,
                newOrders: 1,
                confirmed: 1,
                processing: 1,
                dispatched: 1,
                delivered: 1,
                cancelled: 1,
                delayed: 1,

                newAmount: {
                  $round: ["$newAmount", 2],
                },

                pendingDispatchAmount: {
                  $round: [
                    "$pendingDispatchAmount",
                    2,
                  ],
                },

                dispatchedAmount: {
                  $round: [
                    "$dispatchedAmount",
                    2,
                  ],
                },

                deliveredAmount: {
                  $round: [
                    "$deliveredAmount",
                    2,
                  ],
                },

                delayedAmount: {
                  $round: [
                    "$delayedAmount",
                    2,
                  ],
                },
              },
            },
          ],

          // ======================================================
          // PAGINATION
          // ======================================================

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const result = await Order.aggregate(pipeline);

    const orders = result?.[0]?.orders || [];

    const stats = result?.[0]?.stats?.[0] || {};

    const total =
      result?.[0]?.totalCount?.[0]?.count || 0;

    // ======================================================
    // FORMAT ORDERS
    // ======================================================

    const formattedOrders = orders.map((order) => {
      const totalAmount = order.items.reduce((sum, item) => {
        return sum + (item.total || 0);
      }, 0);

      return {
        _id: order._id,

        orderId: order.orderId,

        orderType: order.orderType,

        status: order.status,

        paymentStatus: order.paymentStatus,

        createdAt: order.createdAt,

        customer: order.customer,

        itemCount: order.items.length,

        orderDetails: order.items.map((item) => ({
          productId: item.product?._id || "",

          variantId: item.variant?._id || "",

          productName: item.product?.name || "",

          image: item.product?.images?.[0] || "",

          quantity: item.quantity,

          measurementUnit:
            item.product?.measurementUnit || "",

          size: item.variant?.size || "",

          price: item.price,

          finalPrice: item.finalPrice,

          gstAmount: item.gstAmount,

          deliveryFee: item.deliveryFee,

          vendorAmount: item.vendorAmount,

          packageWeight: item.packageWeight,

          deliveryType: item.deliveryType,

          durationTime: item.durationTime,

          distance: item.distance,

          status: item.status,

          statusProgress: item.statusProgress,

          total: item.total,
        })),

        billSummary: {
          totalAmount: Number(totalAmount.toFixed(2)),
        },
      };
    });

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      message:
        "Vendor analytics fetched successfully",

      data: {
        stats: {
          total: stats.total || 0,

          newOrders: stats.newOrders || 0,

          confirmed: stats.confirmed || 0,

          processing: stats.processing || 0,

          dispatched: stats.dispatched || 0,

          delivered: stats.delivered || 0,

          cancelled: stats.cancelled || 0,

          delayed: stats.delayed || 0,

          newAmount: Number(
            (stats.newAmount || 0).toFixed(2),
          ),

          pendingDispatchAmount: Number(
            (
              stats.pendingDispatchAmount || 0
            ).toFixed(2),
          ),

          dispatchedAmount: Number(
            (
              stats.dispatchedAmount || 0
            ).toFixed(2),
          ),

          deliveredAmount: Number(
            (
              stats.deliveredAmount || 0
            ).toFixed(2),
          ),

          delayedAmount: Number(
            (
              stats.delayedAmount || 0
            ).toFixed(2),
          ),
        },

        orders: formattedOrders,

        pagination: {
          total,

          page: pageNumber,

          limit: limitNumber,

          totalPages: Math.ceil(
            total / limitNumber,
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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
    // const productsRes = await Order.aggregate([
    //   { $match: baseMatch },
    //   { $unwind: "$items" },
    //   { $match: { "items.vendorId": vendorObjectId } },
    //   { $group: { _id: "$items.productId" } },
    //   { $count: "count" },
    // ]);

    const totalProducts = await Product.countDocuments({
      vendorId: vendorObjectId,
    });

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
        totalProducts: totalProducts || 0,
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
export const getRFQOverview = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);

    const overview = await rfqModel.aggregate([
      {
        $match: {
          vendorId,
        },
      },

      {
        $group: {
          _id: null,

          // total rfq received
          totalReceived: {
            $sum: 1,
          },

          // pending rfq
          totalPendingRFQ: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },

          // quotations sent
          totalSendQuotations: {
            $sum: {
              $cond: [{ $eq: ["$status", "quoted"] }, 1, 0],
            },
          },

          // won / completed
          totalWonComplete: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          totalReceived: 1,
          totalPendingRFQ: 1,
          totalSendQuotations: 1,
          totalWonComplete: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "RFQ overview fetched successfully",
      data: overview[0] || {
        totalReceived: 0,
        totalPendingRFQ: 0,
        totalSendQuotations: 0,
        totalWonComplete: 0,
      },
    });
  } catch (error) {
    console.error("getRFQOverview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getOrderDeliveryOverview = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);

    // today start/end
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Order.aggregate([
      {
        $unwind: "$items",
      },

      {
        $match: {
          "items.vendorId": vendorId,
        },
      },

      {
        $group: {
          _id: null,

          // DELIVERED TODAY
          deliveredToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ["$items.status", "DELIVERED"],
                    },
                    {
                      $gte: ["$updatedAt", startOfDay],
                    },
                    {
                      $lte: ["$updatedAt", endOfDay],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // IN TRANSIT
          inTransit: {
            $sum: {
              $cond: [
                {
                  $in: ["$items.status", ["SHIPPED", "PACKED"]],
                },
                1,
                0,
              ],
            },
          },

          // OUT FOR DELIVERY
          outForDelivery: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "OUT_FOR_DELIVERY"],
                },
                1,
                0,
              ],
            },
          },

          // DELAYED
          delayed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $in: [
                        "$items.status",
                        ["CONFIRMED", "ACCEPTED", "PACKED", "SHIPPED"],
                      ],
                    },

                    // older than 3 days
                    {
                      $lt: [
                        "$createdAt",
                        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // POD PENDING
          podPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ["$items.status", "DELIVERED"],
                    },
                    {
                      $eq: ["$paymentMethod", "COD"],
                    },
                    {
                      $ne: ["$paymentStatus", "PAID"],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          deliveredToday: 1,
          inTransit: 1,
          outForDelivery: 1,
          delayed: 1,
          podPending: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Order delivery overview fetched successfully",

      data: result[0] || {
        deliveredToday: 0,
        inTransit: 0,
        outForDelivery: 0,
        delayed: 0,
        podPending: 0,
      },
    });
  } catch (error) {
    console.error("getOrderDeliveryOverview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================
// PAYMENT SUMMARY
// =====================================

export const getPaymentSummary = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);

    // TODAY
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // THIS WEEK
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await Order.aggregate([
      {
        $unwind: "$items",
      },

      {
        $match: {
          "items.vendorId": vendorId,
        },
      },

      {
        $group: {
          _id: null,

          // TODAY COLLECTIONS
          todaysCollections: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ["$paymentStatus", "PAID"],
                    },

                    {
                      $gte: ["$updatedAt", startOfDay],
                    },

                    {
                      $lte: ["$updatedAt", endOfDay],
                    },
                  ],
                },

                {
                  $ifNull: ["$items.vendorAmount", 0],
                },

                0,
              ],
            },
          },

          // PENDING SETTLEMENTS
          totalPendingSettlements: {
            $sum: {
              $cond: [
                {
                  $eq: ["$paymentStatus", "UNPAID"],
                },

                {
                  $ifNull: ["$items.vendorAmount", 0],
                },

                0,
              ],
            },
          },

          // THIS WEEK REVENUE
          thisWeekRevenue: {
            $sum: {
              $cond: [
                {
                  $gte: ["$createdAt", startOfWeek],
                },

                {
                  $ifNull: ["$items.vendorAmount", 0],
                },

                0,
              ],
            },
          },

          // OUTSTANDING AMOUNT
          outstandingAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: ["$items.status", "DELIVERED"],
                    },

                    {
                      $in: ["$paymentStatus", ["UNPAID", "FAILED"]],
                    },
                  ],
                },

                {
                  $ifNull: ["$items.vendorAmount", 0],
                },

                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          todaysCollections: {
            $round: ["$todaysCollections", 2],
          },
          totalPendingSettlements: {
            $round: ["$totalPendingSettlements", 2],
          },
          thisWeekRevenue: {
            $round: ["$thisWeekRevenue", 2],
          },
          outstandingAmount: {
            $round: ["$outstandingAmount", 2],
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Payment summary fetched successfully",

      data: result[0] || {
        todaysCollections: 0,
        totalPendingSettlements: 0,
        thisWeekRevenue: 0,
        outstandingAmount: 0,
      },
    });
  } catch (error) {
    console.error("getPaymentSummary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// ==========================
// GET ALL TOP SELLING PRODUCTS
// pagination + limit + skip
// ==========================
export const getTopSellingProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;

    let { page = 1, limit = 10, skip } = req.query;

    page = Number(page);
    limit = Number(limit);

    skip = skip !== undefined ? Number(skip) : (page - 1) * limit;

    const matchQuery = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      disable: false,
      varified: true,
      sold: { $gt: 0 },
    };

    const [products, total] = await Promise.all([
      Product.aggregate([
        {
          $match: matchQuery,
        },

        {
          $lookup: {
            from: "variants",
            localField: "defaultVariantId",
            foreignField: "_id",
            as: "defaultVariant",
          },
        },

        {
          $unwind: {
            path: "$defaultVariant",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            totalSaleAmount: {
              $multiply: [
                "$sold",
                {
                  $ifNull: ["$defaultVariant.price", 0],
                },
              ],
            },
          },
        },

        {
          $project: {
            _id: 1,
            name: 1,
            images: 1,
            sold: 1,
            totalSaleAmount: 1,
          },
        },

        {
          $sort: {
            sold: -1,
            createdAt: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: limit,
        },
      ]),

      Product.countDocuments(matchQuery),
    ]);

    return res.status(200).json({
      success: true,
      message: "Vendor top selling products fetched successfully",

      pagination: {
        total,
        page,
        limit,
        skip,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + products.length < total,
        hasPrevPage: skip > 0,
      },

      data: products,
    });
  } catch (error) {
    console.error("getTopSellingProducts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//accept order and updates all order status

// export const vendorUpdateOrder = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const vendorId = req.user.id;

//     // console.log("vendorId-middleware", vendorId);
//     const { subOrderId } = req.params;
//     const { action, reason } = req.body;

//     const allowedActions = [
//       "ACCEPT",
//       "REJECT",
//       "READY_FOR_SHIP",
//       "SHIP",
//       "DELIVER",
//     ];

//     if (!allowedActions.includes(action)) {
//       throw new APIError(400, "Invalid action");
//     }

//     const subOrder = await Order.findOne({
//       _id: subOrderId,
//       orderType: "SUB",
//     }).session(session);

//     if (!subOrder) throw new APIError(404, "Sub order not found");

//     // // vendor check
//     const isValidVendor = subOrder.items.some(
//       (item) => item.vendorId.toString() === vendorId.toString(),
//     );

//     if (!isValidVendor) {
//       throw new APIError(
//         403,
//         "You do not have permission to update this order",
//       );
//     }

//     const currentStatus = subOrder.items[0].status;

//     const validTransitions = {
//       PENDING: ["ACCEPT", "REJECT"],
//       ACCEPTED: ["READY_FOR_SHIP"],
//       PACKED: ["SHIP"],
//       SHIPPED: ["DELIVER"],
//     };

//     if (!validTransitions[currentStatus]?.includes(action)) {
//       throw new APIError(
//         400,
//         `Cannot ${action} when status is ${currentStatus}`,
//       );
//     }

//     const actionMap = {
//       ACCEPT: { item: "ACCEPTED", order: "CONFIRMED" },
//       REJECT: { item: "CANCELLED", order: "CANCELLED" },
//       READY_FOR_SHIP: { item: "PACKED", order: "PROCESSING" },
//       SHIP: { item: "SHIPPED", order: "OUT_FOR_DELIVERY" },
//       DELIVER: { item: "DELIVERED", order: "DELIVERED" },
//     };

//     const { item: itemStatus, order: orderStatus } = actionMap[action];

//     const now = new Date();

//     //  Generate statusProgress for Item
//     const itemStatusProgress = getItemStatusProgress(itemStatus, now);

//     //  SELF delivery check
//     // if (action === "SHIP") {
//     //   const isSelf = subOrder.items.some((i) => i.deliveryType === "self");

//     //   if (!isSelf) {
//     //     throw new APIError(
//     //       400,
//     //       "Only SELF delivery orders can be shipped by vendor",
//     //     );
//     //   }
//     // }

//     await Order.updateOne(
//       { _id: subOrder._id },
//       {
//         $set: {
//           status: orderStatus,
//           reason: reason || null,
//           cancleBy: action === "REJECT" ? "VENDOR" : null,
//           "items.$[].status": itemStatus,
//           "items.$[].statusProgress": itemStatusProgress,
//         },
//       },
//       { session },
//     );

//     if (action === "REJECT") {
//       const variantOps = subOrder.items.map((item) => ({
//         updateOne: {
//           filter: { _id: item.variantId },
//           update: { $inc: { stock: item.quantity, sold: -item.quantity } },
//         },
//       }));

//       if (variantOps.length) {
//         await Variant.bulkWrite(variantOps, { session });
//       }
//     }

//     const subOrders = await Order.find({
//       parentId: subOrder.parentId,
//       orderType: "SUB",
//     }).session(session);

//     let masterStatus = "PROCESSING";

//     if (subOrders.every((o) => o.status === "DELIVERED")) {
//       masterStatus = "DELIVERED";

//       // for (const sub of subOrders) {
//       //   const vendorId = sub.items[0].vendorId;
//       //   const alreadySettled = await vendorTransactionModel
//       //     .findOne({
//       //       orderId: sub._id,
//       //       type: "ORDER_SETTLEMENT",
//       //     })
//       //     .session(session);

//       //   if (!alreadySettled) {
//       //     await addSettlement(vendorId, sub._id, sub.netAmount, session);
//       //   }
//       // }

//       // for (const sub of subOrders) {
//       //   const vendorId = sub.items[0].vendorId;

//       //   const alreadySettled = await vendorTransactionModel
//       //     .findOne({
//       //       orderId: sub._id,
//       //       type: "ORDER_SETTLEMENT",
//       //     })
//       //     .session(session);

//       //   if (!alreadySettled) {
//       //     const vendorTotal = sub.items.reduce((sum, item) => {
//       //       return sum + (item.vendorAmount || 0);
//       //     }, 0);

//       //     await addSettlement(vendorId, sub._id, vendorTotal, session);
//       //   }
//       // }

//       for (const sub of subOrders) {
//         // ======================================================
//         // GROUP ITEMS BY VENDOR
//         // ======================================================

//         const vendorMap = {};

//         for (const item of sub.items) {
//           const vendorId = item.vendorId.toString();

//           if (!vendorMap[vendorId]) {
//             vendorMap[vendorId] = 0;
//           }

//           vendorMap[vendorId] += item.vendorAmount || 0;
//         }

//         // ======================================================
//         // CREATE SETTLEMENT FOR EACH VENDOR
//         // ======================================================

//         for (const [vendorId, vendorTotal] of Object.entries(vendorMap)) {
//           const alreadySettled = await vendorTransactionModel
//             .findOne({
//               orderId: sub._id,
//               vendorId,
//               type: "ORDER_SETTLEMENT",
//             })
//             .session(session);

//           if (!alreadySettled) {
//             await addSettlement(vendorId, sub._id, vendorTotal, session);
//           }
//         }
//       }
//     } else if (subOrders.some((o) => o.status === "OUT_FOR_DELIVERY")) {
//       masterStatus = "OUT_FOR_DELIVERY";
//     } else if (subOrders.some((o) => o.status === "CONFIRMED")) {
//       masterStatus = "CONFIRMED";
//     }

//     await Order.updateOne(
//       { _id: subOrder.parentId },
//       { $set: { status: masterStatus } },
//       { session },
//     );

//     await session.commitTransaction();
//     session.endSession();

//     await redis.incr(`vendor:orders:version:${vendorId}`);

//     return res.status(200).json({
//       success: true,
//       message: `${action} successful`,
//       itemStatus,
//       orderStatus,
//       masterStatus,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     next(error);
//   }
// };

export const vendorUpdateOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user.id;
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

    const vendorItems = subOrder.items.filter(
      (item) => item.vendorId.toString() === vendorId.toString(),
    );

    if (vendorItems.length === 0) {
      throw new APIError(
        403,
        "You do not have permission to update this order",
      );
    }

    const currentItemStatus = vendorItems[0].status;

    const validTransitions = {
      PENDING: ["ACCEPT", "REJECT"],
      ACCEPTED: ["READY_FOR_SHIP"],
      PACKED: ["SHIP"],
      SHIPPED: ["DELIVER"],
    };

    if (!validTransitions[currentItemStatus]?.includes(action)) {
      throw new APIError(
        400,
        `Cannot ${action} when status is ${currentItemStatus}`,
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
    const now = new Date();

    const itemStatusProgress = getItemStatusProgress(itemStatus, now);

    // 🔥 Fixed Update Query
    const updateResult = await Order.updateOne(
      {
        _id: subOrder._id,
        "items.vendorId": new mongoose.Types.ObjectId(vendorId), // ← 'new' added
      },
      {
        $set: {
          status: orderStatus,
          reason: reason?.trim() || null,
          cancleBy: action === "REJECT" ? "VENDOR" : null,
          "items.$.status": itemStatus,
          "items.$.statusProgress": itemStatusProgress,
        },
      },
      { session },
    );

    if (updateResult.modifiedCount === 0) {
      throw new APIError(400, "Failed to update order status");
    }

    // Reject - Stock Revert
    if (action === "REJECT") {
      const variantOps = vendorItems.map((item) => ({
        updateOne: {
          filter: { _id: item.variantId },
          update: { $inc: { stock: item.quantity, sold: -item.quantity } },
        },
      }));
      if (variantOps.length) await Variant.bulkWrite(variantOps, { session });
    }

    // Master Order + Settlement Logic
    const subOrders = await Order.find({
      parentId: subOrder.parentId,
      orderType: "SUB",
    }).session(session);

    let masterStatus = "PROCESSING";

    if (subOrders.every((o) => o.status === "DELIVERED")) {
      masterStatus = "DELIVERED";

      for (const sub of subOrders) {
        const vendorMap = {};
        for (const item of sub.items) {
          const vId = item.vendorId.toString();
          vendorMap[vId] = (vendorMap[vId] || 0) + (item.vendorAmount || 0);
        }

        for (const [vId, amount] of Object.entries(vendorMap)) {
          const alreadySettled = await vendorTransactionModel
            .findOne({
              orderId: sub._id,
              vendorId: vId,
              type: "ORDER_SETTLEMENT",
            })
            .session(session);

          if (!alreadySettled) {
            await addSettlement(vId, sub._id, Number(amount), session);
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
    console.error("Vendor Update Error:", error);
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

// product section in dashboard --------->

export const getAllProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // filters
    const filter = {
      vendorId,
    };

    const cacheKey = `vendor:${vendorId}:products:page:${page}:limit:${limit}`;

    // =========================
    // CHECK CACHE
    // =========================
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: JSON.parse(cachedData),
      });
    }
    // verified filter
    // ?varified=true
    // ?varified=false
    if (req.query.varified !== undefined) {
      filter.varified = req.query.varified === "true";
    }

    // total count
    const totalProducts = await Product.countDocuments(filter);

    // products
    const products = await Product.find(filter)
      .sort({ createdAt: -1 }) // latest top
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      pagination: {
        totalProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        limit,
      },
      filters: {
        varified:
          req.query.varified !== undefined
            ? req.query.varified === "true"
            : "ALL",
      },
      data: products,
    });
  } catch (error) {
    await redisCache.set(cacheKey, JSON.stringify(products));
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// export const getProductById = async (req, res) => {
//   try {
//     const vendorId = req.user.id;
//     const { productId } = req.params;

//     // ======================
//     // CACHE KEY
//     // ======================
//     const cacheKey = `vendor:${vendorId}:product:${productId}`;

//     // ======================
//     // CHECK CACHE
//     // ======================
//     const cachedData = await redisCache.get(cacheKey);

//     if (cachedData) {
//       return res.status(200).json({
//         success: true,
//         source: "cache",
//         data: JSON.parse(cachedData),
//       });
//     }

//     // ======================
//     // DB QUERY
//     // ======================
//     const product = await Product.findOne({
//       _id: productId,
//       vendorId,
//     })
//       .populate("pcategoryId", "name")
//       .populate("categoryId", "name")
//       .populate("brandId", "name logo")
//       .populate("subcategoryId", "name")
//       .populate("productTypeId", "typeName");

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     // ======================
//     // CUSTOM RESPONSE
//     // ======================
//     const formattedProduct = {
//       ...product.toObject(),

//       parentCategory: product.pcategoryId
//         ? {
//             id: product.pcategoryId._id,
//             name: product.pcategoryId.name,
//           }
//         : null,

//       category: product.categoryId
//         ? {
//             id: product.categoryId._id,
//             name: product.categoryId.name,
//           }
//         : null,

//       brand: product.brandId
//         ? {
//             id: product.brandId._id,
//             name: product.brandId.name,
//             logo: product.brandId.logo,
//           }
//         : null,

//       subcategories: product.subcategoryId?.map((item) => ({
//         id: item._id,
//         name: item.name,
//       })),

//       productTypes: product.productTypeId?.map((item) => ({
//         id: item._id,
//         name: item.typeName,
//       })),
//     };

//     // optional old ids remove
//     delete formattedProduct.pcategoryId;
//     delete formattedProduct.categoryId;
//     delete formattedProduct.brandId;
//     delete formattedProduct.subcategoryId;
//     delete formattedProduct.productTypeId;

//     // ======================
//     // CACHE SET
//     // ======================
//     await redisCache.set(cacheKey, JSON.stringify(formattedProduct), 300);

//     return res.status(200).json({
//       success: true,
//       source: "database",
//       data: formattedProduct,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const getProductById = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const vendorId = req.user.id;

    // ======================
    // CACHE KEY
    // ======================
    const cacheKey = `vendor:${vendorId}:product:${productId}`;

    // ======================
    // CHECK CACHE
    // ======================
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: JSON.parse(cachedData),
      });
    }

    // =========================
    // 1. Get Product (same response)
    // =========================
    const product = await Product.findOne({
      _id: new mongoose.Types.ObjectId(productId),
      vendorId: new mongoose.Types.ObjectId(vendorId),
    })
      .populate("pcategoryId", "name")
      .populate("categoryId", "name")
      .populate("brandId", "name logo")
      .populate("subcategoryId", "name")
      .populate("productTypeId", "typeName")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // =========================
    // 2. Get ALL variants of product
    // =========================
    const variants = await Variant.find({
      productId: product._id,
    })
      .select(
        "price discountAmount quantity discount packageWeight packageDimensions moq mrp size sold stock Type",
      )
      .lean();

    // =========================
    // 3. Attach inside product (AS REQUESTED)
    // =========================
    product.variants = variants; // FULL REPLACE HERE

    await redisCache.set(cacheKey, JSON.stringify(product), 300);

    // =========================
    // 5. Response SAME STRUCTURE
    // =========================
    return res.status(200).json({
      success: true,
      source: "database",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProductDisable = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.disable = !product.disable;
    await product.save();

    await redisCache.deletePattern("home:*");
    await redisCache.deletePattern(`vendor:${vendorId}:products:*`);
    await redisCache.delete(`vendor:${vendorId}:product:${productId}`);

    // Clear product list cache for this vendor
    return res.status(200).json({
      success: true,
      message: product.disable
        ? "Product disabled successfully"
        : "Product enabled successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const updateProduct = async (req, res) => {
//   try {
//     const vendorId = req.user.id;
//     const { productId } = req.params;

//     const product = await Product.findOne({
//       _id: productId,
//       vendorId,
//     });

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     if (product.disable) {
//       return res.status(403).json({
//         success: false,
//         message: "Product is disabled",
//       });
//     }

//     // =========================
//     // SAFE FIELDS PROTECTION
//     // =========================
//     const blockedFields = ["_id", "vendorId", "createdAt", "updatedAt", "__v"];

//     // =========================
//     // UPDATE EVERYTHING (BODY BASED)
//     // =========================
//     Object.keys(req.body).forEach((key) => {
//       if (!blockedFields.includes(key)) {
//         product[key] = req.body[key];
//       }
//     });

//     // =========================
//     // IMAGES (S3 UPLOAD)
//     // =========================
//     if (req.files?.images?.length > 0) {
//       product.images = req.files.images.map((f) => f.location);
//     }

//     // =========================
//     // SAVE
//     // =========================
//     await product.save();
//     await redisCache.deletePattern("home:*");
//     await redisCache.deletePattern(`vendor:${vendorId}:products:*`);
//     await redisCache.delete(`vendor:${vendorId}:product:${productId}`);
//     // Clear product list cache for this vendor
//     return res.status(200).json({
//       success: true,
//       message: "Product updated successfully",
//       data: product,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const updateProduct = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      vendorId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.disable) {
      return res.status(403).json({
        success: false,
        message: "Product is disabled",
      });
    }

    // =========================
    // SAFE FIELDS PROTECTION
    // =========================
    const blockedFields = ["_id", "vendorId", "createdAt", "updatedAt", "__v"];

    // =========================
    // PARSE ARRAY FIELDS
    // =========================

    if (typeof req.body.subcategoryId === "string") {
      try {
        req.body.subcategoryId = JSON.parse(req.body.subcategoryId);
      } catch (err) {
        req.body.subcategoryId = [req.body.subcategoryId];
      }
    }

    if (typeof req.body.productTypeId === "string") {
      try {
        req.body.productTypeId = JSON.parse(req.body.productTypeId);
      } catch (err) {
        req.body.productTypeId = [req.body.productTypeId];
      }
    }

    // =========================
    // SHIPPING CHARGES PARSE
    // =========================

    if (typeof req.body.shippingCharges === "string") {
      try {
        req.body.shippingCharges = JSON.parse(req.body.shippingCharges);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid shippingCharges format",
        });
      }
    }

    if (req.body.shippingCharges) {
      const shipping = req.body.shippingCharges;

      // fixed validation
      if (
        shipping.fixed === undefined ||
        shipping.fixed === null ||
        shipping.fixed === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Fixed shipping charge is required",
        });
      }

      // distance validation
      if (
        shipping.distancePerKm === undefined ||
        shipping.distancePerKm === null ||
        shipping.distancePerKm === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Distance per KM shipping charge is required",
        });
      }

      req.body.shippingCharges = {
        fixed: Number(shipping.fixed || 0),
        distancePerKm: Number(shipping.distancePerKm || 0),

        weightPerKg: Number(shipping.weightPerKg || 0),
        perPieceCharge: Number(shipping.perPieceCharge || 0),
        perLiterCharge: Number(shipping.perLiterCharge || 0),
        perMeterCharge: Number(shipping.perMeterCharge || 0),
        perBoxCharge: Number(shipping.perBoxCharge || 0),
        perSuperMeterCharge: Number(shipping.perSuperMeterCharge || 0),
        perCubicMeterCharge: Number(shipping.perCubicMeterCharge || 0),
        perSetCharge: Number(shipping.perSetCharge || 0),
        perRollCharge: Number(shipping.perRollCharge || 0),
      };

      // at least one extra charge
      const extraChargeFields = [
        "weightPerKg",
        "perPieceCharge",
        "perLiterCharge",
        "perMeterCharge",
        "perBoxCharge",
        "perSuperMeterCharge",
        "perCubicMeterCharge",
        "perSetCharge",
        "perRollCharge",
      ];

      const hasAnyExtraCharge = extraChargeFields.some(
        (field) => Number(req.body.shippingCharges[field]) > 0,
      );

      if (!hasAnyExtraCharge) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide at least one additional shipping charge type",
        });
      }
    }

    // =========================
    // DUPLICATE PRODUCT CHECK
    // =========================

    if (req.body.name || req.body.slug) {
      const duplicateProduct = await Product.findOne({
        _id: { $ne: productId },
        vendorId,
        $or: [
          req.body.name
            ? {
                name: {
                  $regex: `^${req.body.name}$`,
                  $options: "i",
                },
              }
            : null,

          req.body.slug
            ? {
                slug: {
                  $regex: `^${req.body.slug}$`,
                  $options: "i",
                },
              }
            : null,
        ].filter(Boolean),
      }).select("name slug");

      if (duplicateProduct) {
        return res.status(409).json({
          success: false,
          message: `Product already exists with name "${duplicateProduct.name}"`,
        });
      }
    }

    // =========================
    // UPDATE EVERYTHING
    // =========================

    Object.keys(req.body).forEach((key) => {
      if (!blockedFields.includes(key)) {
        product[key] = req.body[key];
      }
    });

    // =========================
    // IMAGES
    // =========================

    if (req.files?.images?.length > 0) {
      product.images = req.files.images.map((f) => f.location);
    }

    // =========================
    // THUMBNAIL
    // =========================

    if (req.files?.thumbnail?.[0]?.location) {
      product.thumbnail = req.files.thumbnail[0].location;
    }

    // =========================
    // SAVE
    // =========================

    await product.save();

    // =========================
    // CACHE CLEAR
    // =========================

    await redisCache.deletePattern("home:*");
    await redisCache.deletePattern(`vendor:${vendorId}:products:*`);
    await redisCache.delete(`vendor:${vendorId}:product:${productId}`);

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const profileWallet = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const totalProducts = await Product.countDocuments({
      vendorId: vendorObjectId,
    });

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
    endOfMonth.setUTCDate(0);
    endOfMonth.setUTCHours(23, 59, 59, 999);

    const totalOrders = await Order.countDocuments({
      "items.vendorId": vendorObjectId,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    const totalEarningsData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "PAID",
          "items.vendorId": vendorObjectId,
        },
      },

      {
        $unwind: "$items",
      },

      {
        $match: {
          "items.vendorId": vendorObjectId,
          "items.status": { $ne: "CANCELLED" },
        },
      },

      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$items.vendorAmount" },
        },
      },
    ]);

    const totalEarnings = totalEarningsData[0]?.totalEarnings || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalEarnings,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//// dashboard overviews

// export const getVendorOverviews = async (req, res, next) => {
//   try {
//     const vendorId = req.user.id;

//     let { date } = req.query;

//     // DEFAULT TODAY DATE
//     if (!date) {
//       const today = new Date();
//       date = today.toISOString().split("T")[0];
//     }

//     // START / END OF DAY
//     const startOfDay = new Date(date);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(date);
//     endOfDay.setHours(23, 59, 59, 999);

//     // START OF WEEK
//     const startOfWeek = new Date();
//     startOfWeek.setDate(
//       startOfWeek.getDate() - startOfWeek.getDay(),
//     );
//     startOfWeek.setHours(0, 0, 0, 0);

//     const vendorObjectId =
//       new mongoose.Types.ObjectId(vendorId);

//     const baseMatch = {
//       "items.vendorId": vendorObjectId,
//       orderType: "SUB",
//     };

//     // =====================================================
//     // QUICK OVERVIEW COUNTS
//     // =====================================================

//     // NEW ORDERS TODAY
//     const newOrdersTodayPromise = Order.aggregate([
//       {
//         $match: {
//           ...baseMatch,
//           createdAt: {
//             $gte: startOfDay,
//             $lte: endOfDay,
//           },
//         },
//       },

//       { $unwind: "$items" },

//       {
//         $match: {
//           "items.vendorId": vendorObjectId,
//           "items.status": "PENDING",
//         },
//       },

//       {
//         $count: "count",
//       },
//     ]);

//     // PENDING DISPATCH
//     const pendingDispatchPromise = Order.aggregate([
//       {
//         $match: baseMatch,
//       },

//       { $unwind: "$items" },

//       {
//         $match: {
//           "items.vendorId": vendorObjectId,
//           "items.status": {
//             $in: ["CONFIRMED", "ACCEPTED"],
//           },
//         },
//       },

//       {
//         $count: "count",
//       },
//     ]);

//     // IN TRANSIT DELIVERY
//     const inTransitDeliveryPromise = Order.aggregate([
//       {
//         $match: baseMatch,
//       },

//       { $unwind: "$items" },

//       {
//         $match: {
//           "items.vendorId": vendorObjectId,
//           "items.status": {
//             $in: ["PACKED", "SHIPPED"],
//           },
//         },
//       },

//       {
//         $count: "count",
//       },
//     ]);

//     // RFQ PENDING
//     const rfqPendingPromise = rfqModel.countDocuments({
//       vendorId: vendorObjectId,
//       status: "pending",
//     });

//     // LOW STOCK PRODUCTS
//     const lowStockProductsPromise =
//       Variant.aggregate([
//         {
//           $match: {
//             stock: { $lt: 10 },
//           },
//         },

//         {
//           $lookup: {
//             from: "products",
//             localField: "productId",
//             foreignField: "_id",
//             as: "product",
//           },
//         },

//         {
//           $unwind: "$product",
//         },

//         {
//           $match: {
//             "product.vendorId": vendorObjectId,
//           },
//         },

//         {
//           $count: "count",
//         },
//       ]);

//     // =====================================================
//     // PAYMENT SUMMARY
//     // =====================================================

//     const paymentSummaryPromise = Order.aggregate([
//       {
//         $match: baseMatch,
//       },

//       { $unwind: "$items" },

//       {
//         $match: {
//           "items.vendorId": vendorObjectId,
//         },
//       },

//       {
//         $group: {
//           _id: null,

//           // TODAY COLLECTIONS
//           todaysCollections: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     {
//                       $eq: [
//                         "$paymentStatus",
//                         "PAID",
//                       ],
//                     },

//                     {
//                       $gte: [
//                         "$createdAt",
//                         startOfDay,
//                       ],
//                     },

//                     {
//                       $lte: [
//                         "$createdAt",
//                         endOfDay,
//                       ],
//                     },
//                   ],
//                 },

//                 {
//                   $ifNull: [
//                     "$items.vendorAmount",
//                     0,
//                   ],
//                 },

//                 0,
//               ],
//             },
//           },

//           // PENDING SETTLEMENTS
//           totalPendingSettlements: {
//             $sum: {
//               $cond: [
//                 {
//                   $eq: [
//                     "$paymentStatus",
//                     "UNPAID",
//                   ],
//                 },

//                 {
//                   $ifNull: [
//                     "$items.vendorAmount",
//                     0,
//                   ],
//                 },

//                 0,
//               ],
//             },
//           },

//           // THIS WEEK REVENUE
//           thisWeekRevenue: {
//             $sum: {
//               $cond: [
//                 {
//                   $gte: [
//                     "$createdAt",
//                     startOfWeek,
//                   ],
//                 },

//                 {
//                   $ifNull: [
//                     "$items.vendorAmount",
//                     0,
//                   ],
//                 },

//                 0,
//               ],
//             },
//           },

//           // OUTSTANDING AMOUNT
//           outstandingAmount: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     {
//                       $ne: [
//                         "$items.status",
//                         "DELIVERED",
//                       ],
//                     },

//                     {
//                       $in: [
//                         "$paymentStatus",
//                         [
//                           "UNPAID",
//                           "FAILED",
//                         ],
//                       ],
//                     },
//                   ],
//                 },

//                 {
//                   $ifNull: [
//                     "$items.vendorAmount",
//                     0,
//                   ],
//                 },

//                 0,
//               ],
//             },
//           },
//         },
//       },

//       {
//         $project: {
//           _id: 0,

//           todaysCollections: {
//             $round: ["$todaysCollections", 2],
//           },

//           totalPendingSettlements: {
//             $round: [
//               "$totalPendingSettlements",
//               2,
//             ],
//           },

//           thisWeekRevenue: {
//             $round: ["$thisWeekRevenue", 2],
//           },

//           outstandingAmount: {
//             $round: [
//               "$outstandingAmount",
//               2,
//             ],
//           },
//         },
//       },
//     ]);

//     // =====================================================
//     // DELIVERY TRACKING
//     // =====================================================

//     const deliveryTrackingPromise = Order.aggregate([
//       {
//         $match: baseMatch,
//       },

//       { $unwind: "$items" },

//       {
//         $match: {
//           "items.vendorId": vendorObjectId,
//         },
//       },

//       {
//         $group: {
//           _id: null,

//           // TODAY DELIVERY
//           todayDelivery: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     {
//                       $eq: [
//                         "$items.status",
//                         "DELIVERED",
//                       ],
//                     },

//                     {
//                       $gte: [
//                         "$createdAt",
//                         startOfDay,
//                       ],
//                     },

//                     {
//                       $lte: [
//                         "$createdAt",
//                         endOfDay,
//                       ],
//                     },
//                   ],
//                 },

//                 1,
//                 0,
//               ],
//             },
//           },

//           // IN TRANSIT
//           inTransit: {
//             $sum: {
//               $cond: [
//                 {
//                   $in: [
//                     "$items.status",
//                     ["PACKED", "SHIPPED"],
//                   ],
//                 },

//                 1,
//                 0,
//               ],
//             },
//           },

//           // OUT FOR DELIVERY
//           outForDelivery: {
//             $sum: {
//               $cond: [
//                 {
//                   $eq: [
//                     "$status",
//                     "OUT_FOR_DELIVERY",
//                   ],
//                 },

//                 1,
//                 0,
//               ],
//             },
//           },

//           // DELAYED
//           delayed: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     {
//                       $in: [
//                         "$items.status",
//                         [
//                           "CONFIRMED",
//                           "ACCEPTED",
//                           "PACKED",
//                           "SHIPPED",
//                         ],
//                       ],
//                     },

//                     {
//                       $lt: [
//                         "$createdAt",
//                         new Date(
//                           Date.now() -
//                             3 *
//                               24 *
//                               60 *
//                               60 *
//                               1000,
//                         ),
//                       ],
//                     },
//                   ],
//                 },

//                 1,
//                 0,
//               ],
//             },
//           },

//           // POD PENDING
//           podPending: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     {
//                       $eq: [
//                         "$items.status",
//                         "DELIVERED",
//                       ],
//                     },

//                     {
//                       $eq: [
//                         "$paymentMethod",
//                         "COD",
//                       ],
//                     },

//                     {
//                       $ne: [
//                         "$paymentStatus",
//                         "PAID",
//                       ],
//                     },
//                   ],
//                 },

//                 1,
//                 0,
//               ],
//             },
//           },
//         },
//       },

//       {
//         $project: {
//           _id: 0,
//           todayDelivery: 1,
//           inTransit: 1,
//           outForDelivery: 1,
//           delayed: 1,
//           podPending: 1,
//         },
//       },
//     ]);

//     // =====================================================
//     // TOP SELLING PRODUCTS
//     // =====================================================

//     const topSellingProductsPromise =
//       Product.aggregate([
//         {
//           $match: {
//             vendorId: vendorObjectId,
//             sold: { $gt: 0 },
//           },
//         },

//         {
//           $lookup: {
//             from: "variants",
//             localField: "defaultVariantId",
//             foreignField: "_id",
//             as: "defaultVariant",
//           },
//         },

//         {
//           $unwind: {
//             path: "$defaultVariant",
//             preserveNullAndEmptyArrays: true,
//           },
//         },

//         {
//           $addFields: {
//             totalSaleAmount: {
//               $multiply: [
//                 "$sold",
//                 {
//                   $ifNull: [
//                     "$defaultVariant.price",
//                     0,
//                   ],
//                 },
//               ],
//             },
//           },
//         },

//         {
//           $project: {
//             _id: 1,
//             name: 1,
//             images: 1,
//             sold: 1,
//             totalSaleAmount: 1,
//           },
//         },

//         {
//           $sort: {
//             sold: -1,
//           },
//         },

//         {
//           $limit: 10,
//         },
//       ]);

//     // =====================================================
//     // RECENT ORDERS
//     // =====================================================

//     const recentOrdersPromise = Order.find(baseMatch)
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .populate("items.productId", "name images")
//       .populate(
//         "items.variantId",
//         "price size packageWeight stock",
//       )
//       .populate("userId", "name")
//       .lean();

//     // =====================================================
//     // RUN ALL PARALLEL
//     // =====================================================

//     const [
//       newOrdersTodayRes,
//       pendingDispatchRes,
//       inTransitDeliveryRes,
//       rfqPendingCount,
//       lowStockProductsRes,
//       paymentSummaryRes,
//       deliveryTrackingRes,
//       topSellingProductsRes,
//       recentOrdersRes,
//     ] = await Promise.all([
//       newOrdersTodayPromise,
//       pendingDispatchPromise,
//       inTransitDeliveryPromise,
//       rfqPendingPromise,
//       lowStockProductsPromise,
//       paymentSummaryPromise,
//       deliveryTrackingPromise,
//       topSellingProductsPromise,
//       recentOrdersPromise,
//     ]);

//     // =====================================================
//     // FINAL RESPONSE
//     // =====================================================

//     const response = {
//       success: true,
//       message:
//         "Vendor overview fetched successfully",

//       selectedDate: date,

//       data: {
//         // QUICK OVERVIEW
//         newOrdersToday:
//           newOrdersTodayRes[0]?.count || 0,

//         pendingDispatch:
//           pendingDispatchRes[0]?.count || 0,

//         inTransitDelivery:
//           inTransitDeliveryRes[0]?.count || 0,

//         rfqPending: rfqPendingCount || 0,

//         lowStockProducts:
//           lowStockProductsRes[0]?.count || 0,

//         // PAYMENT SUMMARY
//         paymentSummary:
//           paymentSummaryRes[0] || {
//             todaysCollections: 0,
//             totalPendingSettlements: 0,
//             thisWeekRevenue: 0,
//             outstandingAmount: 0,
//           },

//         // DELIVERY TRACKING
//         deliveryTracking:
//           deliveryTrackingRes[0] || {
//             todayDelivery: 0,
//             inTransit: 0,
//             outForDelivery: 0,
//             delayed: 0,
//             podPending: 0,
//           },

//         // TOP SELLING PRODUCTS
//         topSellingProducts:
//           topSellingProductsRes || [],

//         // RECENT ORDERS
//         recentOrders: recentOrdersRes || [],
//       },
//     };

//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

export const getVendorOverviews = async (req, res, next) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);

    // ================= CACHE =================
    const cacheKey = `vendor:overview:${vendorId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // ================= DATES =================
    const today = new Date();

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    const baseMatch = {
      "items.vendorId": vendorId,
      orderType: "SUB",
    };

    // =====================================================
    // 1. DELIVERY + ORDER OVERVIEW (FAST + FIXED)
    // =====================================================
    const deliveryAgg = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorId } },
      {
        $group: {
          _id: null,

          newOrdersToday: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfDay] }, 1, 0],
            },
          },

          pendingDispatch: {
            $sum: {
              $cond: [
                { $in: ["$items.status", ["PENDING", "ACCEPTED"]] },
                1,
                0,
              ],
            },
          },

          inTransit: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "SHIPPED"] }, 1, 0],
            },
          },

          outForDelivery: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "OUT_FOR_DELIVERY"] }, 1, 0],
            },
          },

          delayed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$items.status", "OUT_FOR_DELIVERY"] },
                    { $lt: ["$createdAt", startOfWeek] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          deliveredToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$items.status", "DELIVERED"] },
                    { $gte: ["$updatedAt", startOfDay] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          podPending: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "DELIVERED"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // =====================================================
    // 2. PAYMENT SUMMARY (OPTIMIZED + FIXED)
    // =====================================================
    const paymentAgg = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,

          todaysCollections: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", startOfDay] },
                    { $eq: ["$paymentStatus", "PAID"] },
                  ],
                },
                "$netAmount",
                0,
              ],
            },
          },

          totalPendingSettlements: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "PAID"] }, "$netAmount", 0],
            },
          },

          thisWeekRevenue: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfWeek] }, "$netAmount", 0],
            },
          },

          outstandingAmount: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "PAID"] }, "$netAmount", 0],
            },
          },
        },
      },
    ]);

    // =====================================================
    // 3. RFQ OVERVIEW (FIXED STATUS)
    // =====================================================
    const rfqAgg = await rfqModel.aggregate([
      {
        $match: { vendorId },
      },
      {
        $group: {
          _id: null,

          totalRFQReceived: { $sum: 1 },

          totalRFQPending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },

          totalRFQSent: {
            $sum: {
              $cond: [{ $eq: ["$status", "quoted"] }, 1, 0],
            },
          },

          totalRFQWon: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // =====================================================
    // 4. TOP SELLING PRODUCTS (FAST)
    // =====================================================
    const topSellingProducts = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorId } },

      {
        $group: {
          _id: "$items.productId",
          sold: { $sum: "$items.quantity" },
          totalSaleAmount: {
            $sum: {
              $multiply: ["$items.finalPrice", "$items.quantity"],
            },
          },
        },
      },

      { $sort: { sold: -1 } },
      { $limit: 10 },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      {
        $project: {
          _id: 1,
          name: "$product.name",
          images: "$product.images",
          sold: 1,
          totalSaleAmount: 1,
        },
      },
    ]);

    // =====================================================
    // 5. RECENT ORDERS (LIGHTWEIGHT)
    // =====================================================
    const recentOrdersRaw = await Order.find(baseMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name")
      .lean();

    const recentOrders = recentOrdersRaw.map((o) => ({
      orderId: o._id,
      netAmount: o.netAmount,
      userName: o.userId?.name || "",
    }));

    // =====================================================
    // 6. LOW STOCK PRODUCTS (FAST COUNT ONLY)
    // =====================================================
    const lowStockProducts = await Product.countDocuments({
      vendorId,
      stock: { $lt: 10 },
    });

    // =====================================================
    // 7. WALLET
    // =====================================================
    const wallet = await vendorWalletModel.findOne({ vendorId }).lean();

    // =====================================================
    // FINAL RESPONSE
    // =====================================================
    const response = {
      success: true,
      message: "Vendor overview fetched successfully",

      data: {
        newOrdersToday: deliveryAgg[0]?.newOrdersToday || 0,

        pendingDispatch: deliveryAgg[0]?.pendingDispatch || 0,

        inTransitDelivery: deliveryAgg[0]?.inTransit || 0,

        delayed: deliveryAgg[0]?.delayed || 0,

        rfqPending: rfqAgg[0]?.totalRFQPending || 0,

        lowStockProducts: lowStockProducts || 0,

        paymentSummary: {
          todaysCollections: Number(
            (paymentAgg[0]?.todaysCollections || 0).toFixed(2),
          ),
          totalPendingSettlements: Number(
            (paymentAgg[0]?.totalPendingSettlements || 0).toFixed(2),
          ),
          thisWeekRevenue: Number(
            (paymentAgg[0]?.thisWeekRevenue || 0).toFixed(2),
          ),
          outstandingAmount: Number(
            (paymentAgg[0]?.outstandingAmount || 0).toFixed(2),
          ),
        },

        deliveryTracking: {
          todayDelivery: deliveryAgg[0]?.deliveredToday || 0,

          inTransit: deliveryAgg[0]?.inTransit || 0,

          outForDelivery: deliveryAgg[0]?.outForDelivery || 0,

          delayed: deliveryAgg[0]?.delayed || 0,

          podPending: deliveryAgg[0]?.podPending || 0,
        },

        rfqOverview: rfqAgg[0] || {
          totalRFQReceived: 0,
          totalRFQPending: 0,
          totalRFQSent: 0,
          totalRFQWon: 0,
        },

        topSellingProducts,

        recentOrders,

        vendorWallet: {
          totalBalance: wallet?.totalBalance || 0,
        },
      },
    };

    // ================= CACHE SET =================
    await redisCache.set(cacheKey, JSON.stringify(response));

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
