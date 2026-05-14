// import mongoose from "mongoose";

// const orderSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     items: [
//       {
//         product: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Product", // Assuming Product model
//         },
//         variant: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Variant", // If using variants
//         },
//         warranty: Number,
//         price: Number,
//         quantity: Number,
//         returnInDays: Number,
//         returnPolicy: {
//           type: String,
//         },
//         status: {
//           type: String,
//           enum: [
//             "PENDING",
//             "CONFIRMED",
//             "SHIPPED",
//             "VENDOR_CONFIRMED",
//             "VENDOR_CANCELLED",
//             "OUT_FOR_DELIVERY",
//             "DELIVERED",
//             "CANCELLED",
//             "RETURNED",
//           ],
//           default: "PENDING",
//         },

//         //orderStatus: [
//         //   "PENDING",
//         //   "ACCEPTED",
//         //   "READY_FOR_PICKUP",
//         //   "OUT_FOR_DELIVERY",
//         //   "PICKED_UP_BY_LOGISTICS",
//         //   "DELIVERED",
//         //   "CANCELLED"
//         // ]

//         indexStatus: Number,
//         thumbnail: String,
//       },
//     ],

//     vendorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "vendorProfile",
//       // required: false // Master order won't have this
//     },
//     parentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "orderModel",
//       default: null,
//     },
//     orderType: {
//       type: String,
//       enum: ["MASTER", "SUB"],
//       default: "SUB", // Default to SUB if not specified, but we will specify
//     },
//     cityId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "cityModel",
//     },
//     totalAmount: {
//       type: Number,
//     },
//     netAmount: {
//       type: Number,
//     },
//     shippingAddress: {},
//     status: {
//       type: String,
//       enum: [
//         "PENDING",
//         "CONFIRMED",
//         "SHIPPED",
//         "VENDOR_CONFIRMED",
//         "VENDOR_CANCELLED",
//         "OUT_FOR_DELIVERY",
//         "DELIVERED",
//         "CANCELLED",
//         "RETURNED",
//         "RETURN_REQUESTED",
//         "MULTI_STATE",
//       ],
//       default: "PENDING",
//     },

//     paymentStatus: {
//       type: String,
//       enum: ["UNPAID", "PAID", "FAILED", "REFUNDED"],
//       default: "UNPAID",
//     },

//     paymentMethod: {
//       type: String,
//       enum: ["ONLINE", "COD", "WALLET"],
//     },

//     paymentFailedReason: {
//       type: String,
//       trim: true,
//     },
//     transactionId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "transactionModel",
//     },
//     transactionRef: String,
//     trackingNumber: String,
//     labelUrl: String,
//     invoice: String,
//     creditNote: String,
//     reason: String,
//     remark: String,
//     cancleBy: {
//       type: String,
//       enum: ["COSTOMER", "ADMIN", "VANDOR", "SUB_ADMIN"],
//     },
//     deliveryOtp: {
//       type: String,
//     },
//     deliveredDate: Date,

//     deliveryType: {
//       type: String,
//       enum: ["SELF", "VENDOR", "LOGISTIC"],
//       required: function () {
//         return this.orderType === "SUB";
//       },
//     },

//     deliveryCharge: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     //asgr
//     awbCode: {
//       type: String,
//     },
//     courierName: {
//       type: String,
//     },
//     shipmentId: {
//       type: String,
//     },

//     estimatedDeliveryDate: {
//       type: Date,
//     },

//     estimatedDeliveryTime: {
//       type: String,
//     },

//     pickupScheduledDate: {
//       type: Date,
//     },

//     logisticsStatus: {
//       type: String,
//       enum: [
//         "SHIPMENT_CREATED",
//         "PICKUP_SCHEDULED",
//         "PICKED_UP",
//         "IN_TRANSIT",
//         "OUT_FOR_DELIVERY",
//         "DELIVERED",
//       ],
//     },
//   },
//   { timestamps: true },
// );
// orderSchema.index({ parentId: 1, orderType: 1 });
// orderSchema.index({ vandorId: 1, orderType: 1 });
// orderSchema.index({ status: 1 });

// export default mongoose.model("orderModel", orderSchema);

import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
    },

    vendorCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorCompany",
    },

    quantity: {
      type: Number,
      required: true,
    },

    price: Number,
    finalPrice: Number,
    packageWeight: Number,
    vendorAmount: Number,
    gstAmount: Number,

    deliveryType: {
      type: String,
      enum: ["self", "vendor", "logistic"],
      required: true,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "ACCEPTED",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],

      default: "PENDING",
    },

    durationTime: {
      type: String,
      default: "",
    },

    distance: {
      km: {
        type: Number,
        default: 0,
      },

      meter: {
        type: Number,
        default: 0,
      },
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    orderType: {
      type: String,
      enum: ["MASTER", "SUB"],
      default: "MASTER",
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    items: [orderItemSchema],

    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    subTotal: Number,
    totalDeliveryFee: Number,
    netAmount: Number,
    handlingCharge: Number,

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "FAILED"],
      // default: "UNPAID",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE", "WALLET"],
    },
    transactionRef: String,
    labelUrl: String,
    invoice: String,
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactionModel",
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ parentId: 1 });
orderSchema.index({ "items.vendorId": 1 });
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("Order", orderSchema);
