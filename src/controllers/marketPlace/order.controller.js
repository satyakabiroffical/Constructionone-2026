//priyanshu
import mongoose from "mongoose";
import Order from "../../models/marketPlace/order.model.js";
import Cart from "../../models/user/cart.model.js";
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Wallet from "../../models/user/wallet.model.js";
import Transaction from "../../models/user/transaction.model.js";
import calculateBillSummary from "../../services/calculateBillSummary.js";
import razorpayInstance from "../../config/razorpay.conifg.js";
import { APIError } from "../../middlewares/errorHandler.js";
import crypto from "crypto";
import redis from "../../config/redis.config.js";
import {
  sendOrderNotificationToUser,
  sendOrderNotificationToVendor,
} from "../notification.controller.js";
import invoice from "../../middlewares/invoice.middleware.js";
import { prepareOrderForInvoice } from "../../middlewares/invoice.middleware.js";
import vendorTaxInvoice from "../../middlewares/invoice.vendor.js";
import creditNoteInvoice from "../../middlewares/creditNote.middleware.js";
import { VendorCompany } from "../../models/vendorShop/vendor.model.js";
import Address from "../../models/user/address.model.js";
// generateShippingLabel import removed - now used in shipping.worker.js

/**
 * generateOrderInvoices — fire-and-forget helper
 * Generates:
 *   1. User order invoice (on masterOrder)
 *   2. Vendor tax invoice for each subOrder
 * Saves the PDF URL to order.invoice on each respective document.
 */

//priyanshu-------->
// async function generateOrderInvoices(masterOrder, subOrders) {
//   try {
//     // 1. User order invoice
//     const userPdfUrl = await invoice(masterOrder);
//     await Order.updateOne(
//       { _id: masterOrder._id },
//       { $set: { invoice: userPdfUrl } },
//     );

//     // 2. Vendor tax invoices — fetch all VendorCompany docs in one query
//     const vendorIds = [
//       ...new Set(subOrders.map((o) => o.vandorId?.toString()).filter(Boolean)),
//     ];
//     const vendorCompanyDocs = await VendorCompany.find({
//       vendorId: { $in: vendorIds },
//     }).lean();
//     const vcMap = new Map(
//       vendorCompanyDocs.map((vc) => [vc.vendorId.toString(), vc]),
//     );

//     await Promise.allSettled(
//       subOrders.map(async (subOrder) => {
//         const vc = vcMap.get(subOrder.vandorId?.toString()) || {};
//         // Map VendorCompany fields to what buildVendorInvoiceHtml expects
//         const vendorData = {
//           businessName: vc.companyName || "Vendor",
//           gstNumber: vc.gstNumber || "N/A",
//           address: [
//             vc.businessAddress?.address,
//             vc.businessAddress?.city,
//             vc.businessAddress?.state,
//             vc.businessAddress?.pincode,
//           ]
//             .filter(Boolean)
//             .join(", "),
//         };

//         const vendorPdfUrl = await vendorTaxInvoice(subOrder, vendorData);
//         await Order.updateOne(
//           { _id: subOrder._id },
//           { $set: { invoice: vendorPdfUrl } },
//         );
//       }),
//     );
//   } catch (err) {
//     console.error("[Invoice] generateOrderInvoices error:", err.message);
//   }
// }

async function generateOrderInvoices(masterOrder, subOrders) {
  try {
    // =========================
    // 🧾 MASTER INVOICE (USER)
    // =========================
    const populatedMaster = await Order.findById(masterOrder._id)
      .populate("userId")
      .populate("shippingAddressId")
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    // const userPdfUrl = await invoice(populatedMaster);
    const fullOrder = await prepareOrderForInvoice(masterOrder._id);
    const userPdfUrl = await invoice(fullOrder);

    await Order.updateOne(
      { _id: masterOrder._id },
      { $set: { invoice: userPdfUrl } },
    );

    // =========================
    // 🏪 VENDOR IDS SAFETY
    // =========================
    const vendorIds = [
      ...new Set(
        subOrders
          .map((o) => o.items?.[0]?.vendorId)
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    ];

    // =========================
    // 📦 VENDOR DATA FETCH
    // =========================
    const vendorCompanyDocs = await VendorCompany.find({
      vendorId: { $in: vendorIds },
    }).lean();

    const vcMap = new Map(
      vendorCompanyDocs.map((vc) => [vc.vendorId.toString(), vc]),
    );

    // =========================
    // 🧾 VENDOR INVOICES
    // =========================
    await Promise.all(
      subOrders.map(async (subOrder) => {
        const populatedSubOrder = await Order.findById(subOrder._id)
          .populate("userId")
          .populate("shippingAddressId")
          .populate("items.productId")
          .populate("items.variantId")
          .lean();

        const vendorId = populatedSubOrder.items?.[0]?.vendorId?.toString();

        if (!vendorId) return;

        const vc = vcMap.get(vendorId);

        if (!vc) {
          console.warn(`Vendor company missing for ${vendorId}`);
          return;
        }

        const vendorData = {
          businessName: vc.companyName || "Vendor",
          gstNumber: vc.gstNumber || "N/A",
          address: [
            vc.businessAddress?.address,
            vc.businessAddress?.city,
            vc.businessAddress?.state,
            vc.businessAddress?.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        };

        // const vendorPdfUrl = await vendorTaxInvoice(
        //   populatedSubOrder,
        //   vendorData,
        // );

        const fullSubOrder = await prepareOrderForInvoice(subOrder._id);
        const vendorPdfUrl = await vendorTaxInvoice(fullSubOrder, vendorData);

        await Order.updateOne(
          { _id: subOrder._id },
          { $set: { invoice: vendorPdfUrl } },
        );
      }),
    );

    console.log("✅ All invoices generated successfully");
  } catch (err) {
    console.error("[Invoice] generateOrderInvoices error:", err);
  }
}

const calculateVendorSplit = async (cartItems) => {
  const vendorMap = new Map();

  for (const item of cartItems) {
    const vendorId = item.variant.productId.vendorId?.toString();
    console.log("vendor Id" + vendorId);
    if (!vendorId) continue; // skip if product has no vendor assigned
    if (!vendorMap.has(vendorId)) vendorMap.set(vendorId, []);
    vendorMap.get(vendorId).push(item);
  }

  const splitdata = [];
  let grandTotal = 0;

  for (const [vendorId, items] of vendorMap) {
    const billSummary = await calculateBillSummary(items);
    splitdata.push({ vendorId, items, billSummary });
    grandTotal += billSummary.grandTotal;
  }

  return { splitdata, grandTotal };
};
/* ========================== CREATE ORDER ========================== */

// orderStatus: [
//   "PENDING",
//   "ACCEPTED",
//   "READY_FOR_PICKUP",
//   "OUT_FOR_DELIVERY",
//   "PICKED_UP_BY_LOGISTICS",
//   "DELIVERED",
//   "CANCELLED"
// ]

//priyanshu-------->
// export const createOrder = async (req, res, next) => {
//   const session = await mongoose.startSession();

//   try {
//     const userId = req.user._id;
//     const { shippingAddress, paymentMethod } = req.body;
//     if (!shippingAddress || !paymentMethod) {
//       throw new APIError(400, "Shipping address & payment method required");
//     }
//     session.startTransaction();

//     const cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.variant",
//         populate: { path: "productId", model: "Product" },
//       })
//       .session(session);

//     if (!cart || cart.items.length === 0) {
//       throw new APIError(400, "Cart is empty");
//     }

//     // STOCK VALIDATION
//     for (const item of cart.items) {
//       if (item.quantity > item.variant.stock) {
//         throw new APIError(400, `Out of stock: ${item.variant.productId.name}`);
//       }
//     }

//     const { splitdata, grandTotal } = await calculateVendorSplit(cart.items);
//     // console.log(splitdata)
//     const DeliveryDate = new Date();
//     DeliveryDate.setDate(DeliveryDate.getDate() + 7);

//     let paymentStatus = "UNPAID";
//     let orderStatus = "PENDING";

//     if (paymentMethod === "WALLET") {
//       const wallet = await Wallet.findOne({ userId }).session(session);

//       if (!wallet || wallet.balance < grandTotal) {
//         throw new APIError(400, "Insufficient wallet balance");
//       }

//       wallet.balance -= grandTotal;
//       await wallet.save({ session });
//       paymentStatus = "PAID";
//     }
//     // CREATE MASTER ORDER
//     const masterOrder = await Order.create(
//       [
//         {
//           userId,
//           items: cart.items.map((item) => ({
//             product: item.variant.productId._id,
//             variant: item.variant._id,
//             price: item.unitPrice,
//             quantity: item.quantity,
//             status: orderStatus,
//           })),
//           totalAmount: grandTotal,
//           netAmount: grandTotal,
//           shippingAddress,
//           status: orderStatus,
//           paymentStatus,
//           paymentMethod,
//           orderType: "MASTER",
//           deliveredDate: DeliveryDate,
//         },
//       ],
//       { session },
//     );

//     const masterOrderId = masterOrder[0]._id;
//     let razorpayOrderDetails = null;

//     if (paymentMethod === "ONLINE") {
//       const options = {
//         amount: Math.round(grandTotal * 100),
//         currency: "INR",
//         receipt: masterOrderId.toString(),
//       };
//       razorpayOrderDetails = await razorpayInstance.orders.create(options);
//       masterOrder[0].transactionRef = razorpayOrderDetails.id;
//       await masterOrder[0].save({ session });
//     }

//     // TRANSACTION
//     const transaction = await Transaction.create(
//       [
//         {
//           userId,
//           orderId: masterOrderId,
//           amount: grandTotal,
//           paymentMethod,
//           status: ["COD", "ONLINE"].includes(paymentMethod)
//             ? "PENDING"
//             : "SUCCESS",
//         },
//       ],
//       { session },
//     );

//     // CREATE SUB ORDERS
//     const subOrderDocs = splitdata.map((data) => ({
//       userId,
//       items: data.items.map((item) => ({
//         product: item.variant.productId._id,
//         variant: item.variant._id,
//         price: item.unitPrice,
//         quantity: item.quantity,
//         status: orderStatus,
//         returnInDays: item.variant.productId.returnDays ?? 7,
//       })),
//       vendorId: data.vendorId,
//       totalAmount: data.billSummary.grandTotal,
//       shippingAddress,
//       status: orderStatus,
//       paymentStatus,
//       paymentMethod,
//       orderType: "SUB",
//       parentId: masterOrderId,
//       transactionId: transaction[0]._id,
//       deliveredDate: DeliveryDate,
//     }));

//     await Order.insertMany(subOrderDocs, { session });

//     if (paymentMethod !== "ONLINE") {
//       const variantOps = [];
//       const productOps = [];

//       for (const data of splitdata) {
//         for (const item of data.items) {
//           variantOps.push({
//             updateOne: {
//               filter: { _id: item.variant._id },
//               update: { $inc: { stock: -item.quantity, sold: item.quantity } },
//             },
//           });

//           productOps.push({
//             updateOne: {
//               filter: { _id: item.variant.productId._id },
//               update: { $inc: { sold: item.quantity } },
//             },
//           });
//         }
//       }

//       await Promise.all([
//         Variant.bulkWrite(variantOps, { session }),
//         Product.bulkWrite(productOps, { session }),
//       ]);
//     }

//     if (paymentMethod !== "ONLINE") {
//       await Cart.findOneAndUpdate(
//         { userId },
//         { items: [], totalAmount: 0 },
//         { session },
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();

//     await redis.incr(`user:orders:version:${userId}`).catch(console.error);

//     if (paymentMethod !== "ONLINE") {
//       sendOrderNotificationToUser(masterOrder[0], "CONFIRMED").catch(
//         console.error,
//       );

//       Order.find({ parentId: masterOrderId, orderType: "SUB" })
//         .lean()
//         .then((subOrders) => {
//           subOrders.forEach((sub) =>
//             sendOrderNotificationToVendor(sub).catch(console.error),
//           );
//           // Generate invoices
//           generateOrderInvoices(masterOrder[0], subOrders);
//         })
//         .catch(console.error);
//     }

//     const responsePayload = {
//       success: true,
//       message:
//         paymentMethod === "ONLINE"
//           ? "Razorpay order created"
//           : "Order created successfully",
//       masterOrder: masterOrder[0],
//     };

//     if (paymentMethod === "ONLINE") {
//       responsePayload.razorpayOrder = razorpayOrderDetails;
//     }

//     return res.status(201).json(responsePayload);
//   } catch (error) {
//     try {
//       await session.abortTransaction();
//     } catch (abortError) {}
//     session.endSession();
//     next(error);
//   }
// };

// export const verifyPayment = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//       req.body;
//     const userId = req.user.id;

//     const generated = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated !== razorpay_signature)
//       throw new APIError(400, "Payment verification failed");

//     const masterOrder = await Order.findOne({
//       transactionRef: razorpay_order_id,
//       orderType: "MASTER",
//     }).session(session);

//     if (!masterOrder) throw new APIError(404, "Master order not found");

//     const subOrders = await Order.find({
//       parentId: masterOrder._id,
//     }).session(session);

//     const transaction = await Transaction.create(
//       [
//         {
//           userId,
//           orderId: masterOrder._id,
//           amount: masterOrder.totalAmount,
//           paymentMethod: "ONLINE",
//           status: "SUCCESS",
//           razorpayOrderId: razorpay_order_id,
//           razorpayPaymentId: razorpay_payment_id,
//           razorpaySignature: razorpay_signature,
//         },
//       ],
//       { session },
//     );

//     await Order.updateMany(
//       { _id: { $in: [masterOrder._id, ...subOrders.map((o) => o._id)] } },
//       {
//         $set: {
//           status: "CONFIRMED",
//           paymentStatus: "PAID",
//           transactionId: transaction[0]._id,
//           "items.$[].status": "CONFIRMED",
//         },
//       },
//       { session },
//     );

//     const variantOps = [];
//     const productOps = [];

//     for (const order of subOrders) {
//       for (const item of order.items) {
//         variantOps.push({
//           updateOne: {
//             filter: { _id: item.variant },
//             update: { $inc: { stock: -item.quantity, sold: item.quantity } },
//           },
//         });

//         productOps.push({
//           updateOne: {
//             filter: { _id: item.product },
//             update: { $inc: { sold: item.quantity } },
//           },
//         });
//       }
//     }
//     await Promise.all([
//       Variant.bulkWrite(variantOps, { session }),
//       Product.bulkWrite(productOps, { session }),
//     ]);

//     await Cart.findOneAndUpdate(
//       { userId },
//       { items: [], totalAmount: 0 },
//       { session },
//     );

//     await session.commitTransaction();
//     session.endSession();

//     await redis.incr(`user:orders:version:${userId}`);

//     await sendOrderNotificationToUser(masterOrder, "CONFIRMED");

//     subOrders.forEach((sub) =>
//       sendOrderNotificationToVendor(sub).catch(console.error),
//     );
//     generateOrderInvoices(masterOrder, subOrders).catch((err) =>
//       console.error("[Invoice] Background generation failed:", err.message),
//     );

//     res.json({
//       success: true,
//       message: "Payment verified & order placed",
//     });
//   } catch (error) {
//     try {
//       await session.abortTransaction();
//     } catch (abortError) {}
//     session.endSession();
//     next(error);
//   }
// };

//asgar
// export const createOrder = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   let transactionRef = null;
//   let transactionId = null;

//   session.startTransaction();

//   try {
//     const userId = req.user.id;
//     const { addressId, paymentMethod, items } = req.body;

//     if (!addressId || !paymentMethod || !items?.length) {
//       throw new APIError(
//         400,
//         "addressId, paymentMethod and items are required",
//       );
//     }
//     const address = await Address.findOne({
//       _id: addressId,
//       userId,
//     }).session(session);

//     if (!address) {
//       throw new APIError(404, "Address not found");
//     }
//     const cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.variant",
//         populate: {
//           path: "productId",
//           model: "Product",
//           select: `
//             name
//             images
//             vendorId
//             deliveryCharges
//             shippingCharges
//             measurementUnit
//           `,
//         },
//       })
//       .session(session);

//     if (!cart || !cart.items.length) {
//       throw new APIError(400, "Cart is empty");
//     }

//     // ----------------------------------
//     // STOCK VALIDATION
//     // ----------------------------------

//     for (const cartItem of cart.items) {
//       if (cartItem.quantity > cartItem.variant.stock) {
//         throw new APIError(
//           400,
//           `Out of stock: ${cartItem.variant.productId.name}`,
//         );
//       }
//     }
//     let subtotal = 0;
//     let totalDeliveryFee = 0;

//     const vendorMap = new Map();
//     for (const cartItem of cart.items) {
//       const variant = cartItem.variant;
//       const product = variant.productId;

//       const selected = items.find(
//         (i) => i.variantId === variant._id.toString(),
//       );

//       if (!selected) continue;

//       const itemTotal = cartItem.quantity * cartItem.unitPrice;
//       subtotal += itemTotal;

//       let deliveryFee = 0;

//       if (selected.deliveryType === "self") {
//         deliveryFee = 0;
//       }

//       if (selected.deliveryType === "vendor") {
//         deliveryFee = Number(selected.deliveryFee || 0);
//       }

//       if (selected.deliveryType === "logistic") {
//         deliveryFee = Number(selected.deliveryFee || 0);
//       }

//       totalDeliveryFee += deliveryFee;

//       const vendorId = product.vendorId.toString();

//       const preparedItem = {
//         productId: product._id,
//         variantId: variant._id,
//         vendorId: product.vendorId,
//         quantity: cartItem.quantity,
//         price: cartItem.unitPrice,
//         finalPrice: itemTotal,
//         packageWeight: variant.packageWeight || 0,
//         deliveryType: selected.deliveryType,
//         deliveryFee,
//       };

//       if (!vendorMap.has(vendorId)) {
//         vendorMap.set(vendorId, []);
//       }

//       vendorMap.get(vendorId).push(preparedItem);
//     }

//     const grandTotal = subtotal + totalDeliveryFee;
//     let paymentStatus = "UNPAID";

//     // const masterOrder = await Order.create(
//     //   [
//     //     {
//     //       userId,
//     //       orderType: "MASTER",
//     //       shippingAddressId: addressId,
//     //       items: Array.from(vendorMap.values()).flat(),
//     //       subTotal: subtotal,
//     //       totalDeliveryFee,
//     //       netAmount: grandTotal,
//     //       paymentMethod,
//     //       paymentStatus,
//     //       status: "PENDING",
//     //       transactionRef,
//     //     },
//     //   ],
//     //   { session },
//     // );
//     // const masterOrderId = masterOrder[0]._id;

//     if (paymentMethod === "WALLET") {
//       const wallet = await Wallet.findOne({ userId }).session(session);

//       if (!wallet) {
//         throw new APIError(404, "Wallet not found");
//       }

//       if (wallet.balance < grandTotal) {
//         throw new APIError(400, "Insufficient wallet balance");
//       }

//       // deduct wallet amount
//       wallet.balance -= grandTotal;
//       await wallet.save({ session });

//       paymentStatus = "PAID";
//       // status = "CONFIRMED";
//       // transaction entry
//       const transaction = await Transaction.create(
//         [
//           {
//             userId,
//             orderId: masterOrderId,
//             amount: grandTotal,
//             paymentMethod: "WALLET",
//             status: "SUCCESS",
//           },
//         ],
//         { session },
//       );
//       transactionId = transaction[0]._id;
//       // master order update
//       await Order.findByIdAndUpdate(
//         masterOrderId,
//         {
//           paymentStatus: "PAID",
//           status: "CONFIRMED",
//           transactionId,
//           "items.$[].status": "CONFIRMED",
//         },
//         { session },
//       );
//       // sub orders update
//       await Order.updateMany(
//         {
//           parentId: masterOrderId,
//           orderType: "SUB",
//         },
//         {
//           $set: {
//             paymentStatus: "PAID",
//             status: "CONFIRMED",
//             transactionId,
//             "items.$[].status": "CONFIRMED",
//           },
//         },
//         { session },
//       );

//       // stock update
//       const variantOps = [];
//       const productOps = [];

//       for (const items of vendorMap.values()) {
//         for (const item of items) {
//           variantOps.push({
//             updateOne: {
//               filter: { _id: item.variantId },
//               update: {
//                 $inc: {
//                   stock: -item.quantity,
//                   sold: item.quantity,
//                 },
//               },
//             },
//           });

//           productOps.push({
//             updateOne: {
//               filter: { _id: item.productId },
//               update: {
//                 $inc: {
//                   sold: item.quantity,
//                 },
//               },
//             },
//           });
//         }
//       }

//       if (variantOps.length) {
//         await Variant.bulkWrite(variantOps, { session });
//       }

//       if (productOps.length) {
//         await Product.bulkWrite(productOps, { session });
//       }
//       // clear cart
//       await Cart.findOneAndUpdate(
//         { userId },
//         {
//           items: [],
//           totalAmount: 0,
//         },
//         { session },
//       );

//     } else if (paymentMethod === "ONLINE") {
//       paymentStatus = "UNPAID";
//       // Razorpay order create
//       const options = {
//         amount: Math.round(grandTotal * 100), // paise me
//         currency: "INR",
//         receipt: `order_${Date.now()}`,
//         notes: {
//           userId: userId.toString(),
//         },
//       };
//       const razorpayOrder = await razorpayInstance.orders.create(options);

//       if (!razorpayOrder) {
//         throw new APIError(400, "Failed to create Razorpay order");
//       }

//       transactionRef = razorpayOrder.id; // save in master order
//     }
//     const masterOrder = await Order.create(
//       [
//         {
//           userId,
//           orderType: "MASTER",
//           shippingAddressId: addressId,
//           items: Array.from(vendorMap.values()).flat(),
//           subTotal: subtotal,
//           totalDeliveryFee,
//           netAmount: grandTotal,
//           paymentMethod,
//           paymentStatus,
//           status: orderStatus,
//           transactionRef,
//         },
//       ],
//       { session },
//     );
//     const masterOrderId = masterOrder[0]._id;

//     const subOrders = [];
//     for (const [vendorId, vendorItems] of vendorMap.entries()) {
//       const vendorSubTotal = vendorItems.reduce(
//         (sum, item) => sum + item.finalPrice,
//         0,
//       );

//       const vendorDeliveryFee = vendorItems.reduce(
//         (sum, item) => sum + item.deliveryFee,
//         0,
//       );

//       subOrders.push({
//         userId,
//         orderType: "SUB",
//         parentId: masterOrderId,
//         shippingAddressId: addressId,
//         items: vendorItems,
//         subTotal: vendorSubTotal,
//         totalDeliveryFee: vendorDeliveryFee,
//         netAmount: vendorSubTotal + vendorDeliveryFee,
//         paymentMethod,
//         paymentStatus,
//         status: "PENDING",
//       });
//     }
//     await Order.insertMany(subOrders, { session });

//     // ----------------------------------
//     // STOCK UPDATE
//     // ----------------------------------

//     const variantOps = [];
//     const productOps = [];

//     for (const cartItem of cart.items) {
//       variantOps.push({
//         updateOne: {
//           filter: { _id: cartItem.variant._id },
//           update: {
//             $inc: {
//               stock: -cartItem.quantity,
//             },
//           },
//         },
//       });

//       productOps.push({
//         updateOne: {
//           filter: { _id: cartItem.variant.productId._id },
//           update: {
//             $inc: {
//               sold: cartItem.quantity,
//             },
//           },
//         },
//       });
//     }

//     await Promise.all([
//       Variant.bulkWrite(variantOps, { session }),
//       Product.bulkWrite(productOps, { session }),
//     ]);

//     // ----------------------------------
//     // CLEAR CART
//     // ----------------------------------

//     await Cart.findOneAndUpdate(
//       { userId },
//       {
//         items: [],
//         totalAmount: 0,
//       },
//       { session },
//     );

//     await session.commitTransaction();
//     session.endSession();

//     if (paymentStatus === "PAID") {
//       generateOrderInvoices(masterOrder, subOrders).catch((err) =>
//         console.error("[Invoice Generation Failed]", err.message),
//       );
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       masterOrder: masterOrder[0],
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     next(error);
//   }
// };

// 10/10 Production Ready Flow

// createOrder:
// WALLET  -> direct confirm
// ONLINE  -> create razorpay order only
// verifyPayment -> final confirmation for ONLINE

// ======================================================
// CREATE ORDER
// ======================================================

// export const createOrder = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   let transactionRef = null;
//   let transactionId = null;

//   try {
//     const userId = req.user.id;
//     const { addressId, paymentMethod, items } = req.body;

//     if (!addressId || !paymentMethod || !items?.length) {
//       throw new APIError(
//         400,
//         "addressId, paymentMethod and items are required",
//       );
//     }

//     // ------------------------------------------------
//     // ADDRESS
//     // ------------------------------------------------

//     const address = await Address.findOne({
//       _id: addressId,
//       userId,
//     }).session(session);

//     if (!address) {
//       throw new APIError(404, "Address not found");
//     }

//     // ------------------------------------------------
//     // CART
//     // ------------------------------------------------

//     const cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.variant",
//         populate: {
//           path: "productId",
//           model: "Product",
//           select: `
//             name
//             images
//             vendorId
//             measurementUnit
//           `,
//         },
//       })
//       .session(session);

//     if (!cart || !cart.items.length) {
//       throw new APIError(400, "Cart is empty");
//     }

//     // ------------------------------------------------
//     // STOCK VALIDATION
//     // ------------------------------------------------

//     for (const cartItem of cart.items) {
//       if (cartItem.quantity > cartItem.variant.stock) {
//         throw new APIError(
//           400,
//           `Out of stock: ${cartItem.variant.productId.name}`,
//         );
//       }
//     }

//     // ------------------------------------------------
//     // PREPARE ITEMS
//     // ------------------------------------------------
//     const comapnyBillSummary = await calculateBillSummary(cart.items);

//     let subtotal = 0;
//     let totalDeliveryFee = 0;

//     let paymentStatus = "UNPAID";
//     let orderStatus = "PENDING";

//     const vendorMap = new Map();

//     for (const cartItem of cart.items) {
//       const variant = cartItem.variant;
//       const product = variant.productId;

//       const selected = items.find(
//         (i) => i.variantId === variant._id.toString(),
//       );

//       if (!selected) continue;

//       // const itemTotal = cartItem.quantity * cartItem.unitPrice;
//       // subtotal += itemTotal;

//       // let deliveryFee = 0;

//       // if (selected.deliveryType === "self") {
//       //   deliveryFee = 0;
//       // }

//       // if (
//       //   selected.deliveryType === "vendor" ||
//       //   selected.deliveryType === "logistic"
//       // ) {
//       //   deliveryFee = Number(selected.deliveryFee || 0);
//       // }

//       // totalDeliveryFee += deliveryFee;
//       // const vendorId = product.vendorId.toString();

//       // const preparedItem = {
//       //   productId: product._id,
//       //   variantId: variant._id,
//       //   vendorId: product.vendorId,
//       //   quantity: cartItem.quantity,
//       //   price: cartItem.unitPrice,
//       //   finalPrice: itemTotal,
//       //   deliveryType: selected.deliveryType,
//       //   deliveryFee,
//       //   status: "PENDING",
//       //   vendorAmount: totalDeliveryFee + finalPrice,
//       //   gstAmount: comapnyBillSummary.gstAmount,
//       // };

//       const itemTotal = cartItem.quantity * cartItem.unitPrice;
//       subtotal += itemTotal;

//       // ======================================================
//       // DELIVERY FEE
//       // ======================================================

//       let deliveryFee = 0;

//       if (
//         selected.deliveryType === "vendor" ||
//         selected.deliveryType === "logistic"
//       ) {
//         deliveryFee = Number(selected.deliveryFee || 0);
//       }

//       totalDeliveryFee += deliveryFee;

//       // ======================================================
//       // GST
//       // PRODUCT WISE
//       // ======================================================

//       const itemWiseGST = (itemTotal * comapnyBillSummary.taxPercentage) / 100;

//       // ======================================================
//       // VENDOR AMOUNT
//       // product price + vendor/self delivery
//       // GST excluded
//       // ======================================================

//       let vendorAmount = itemTotal;

//       if (
//         selected.deliveryType === "self" ||
//         selected.deliveryType === "vendor"
//       ) {
//         vendorAmount += deliveryFee;
//       }

//       const vendorId = product.vendorId.toString();

//       // ======================================================
//       // PREPARED ITEM
//       // ======================================================

//       const preparedItem = {
//         productId: product._id,

//         variantId: variant._id,

//         vendorId: product.vendorId,

//         quantity: cartItem.quantity,

//         price: cartItem.unitPrice,

//         finalPrice: Number(itemTotal.toFixed(2)),

//         packageWeight: variant.packageWeight || 0,

//         vendorAmount: Number(vendorAmount.toFixed(2)),

//         gstAmount: Number(itemWiseGST.toFixed(2)),

//         deliveryType: selected.deliveryType,

//         deliveryFee,

//         status: "PENDING",
//       };

//       if (!vendorMap.has(vendorId)) {
//         vendorMap.set(vendorId, []);
//       }

//       vendorMap.get(vendorId).push(preparedItem);
//     }
//     subtotal = subtotal + comapnyBillSummary.gstAmount;
//     // const grandTotal = subtotal + totalDeliveryFee;
//     const grandTotal =
//       subtotal + totalDeliveryFee + comapnyBillSummary.handlingCharge;

//     // ------------------------------------------------
//     // WALLET CHECK
//     // ------------------------------------------------

//     if (paymentMethod === "WALLET") {
//       const wallet = await Wallet.findOne({ userId }).session(session);

//       if (!wallet) {
//         throw new APIError(404, "Wallet not found");
//       }

//       if (wallet.balance < grandTotal) {
//         throw new APIError(400, "Insufficient wallet balance");
//       }

//       paymentStatus = "PAID";
//       orderStatus = "CONFIRMED";
//     }

//     // ------------------------------------------------
//     // ONLINE PAYMENT -> RAZORPAY ORDER
//     // ------------------------------------------------

//     if (paymentMethod === "ONLINE") {
//       const razorpayOrder = await razorpayInstance.orders.create({
//         amount: Math.round(grandTotal * 100),
//         currency: "INR",
//         receipt: `order_${Date.now()}`,
//         notes: {
//           userId: userId.toString(),
//         },
//       });

//       if (!razorpayOrder) {
//         throw new APIError(400, "Failed to create Razorpay order");
//       }

//       transactionRef = razorpayOrder.id;
//     }

//     // ------------------------------------------------
//     // MASTER ORDER
//     // ------------------------------------------------

//     const masterOrder = await Order.create(
//       [
//         {
//           userId,
//           orderType: "MASTER",
//           shippingAddressId: addressId,
//           items: Array.from(vendorMap.values()).flat(),
//           subTotal: subtotal,
//           totalDeliveryFee,
//           netAmount: grandTotal,
//           paymentMethod,
//           paymentStatus,
//           status: orderStatus,
//           transactionRef,
//           handlingCharge: comapnyBillSummary.handlingCharge,
//         },
//       ],
//       { session },
//     );

//     const masterOrderId = masterOrder[0]._id;

//     // ------------------------------------------------
//     // SUB ORDERS
//     // ------------------------------------------------

//     const subOrders = [];

//     for (const [vendorId, vendorItems] of vendorMap.entries()) {
//       const vendorSubTotal = vendorItems.reduce(
//         (sum, item) => sum + item.finalPrice,
//         0,
//       );

//       const vendorDeliveryFee = vendorItems.reduce(
//         (sum, item) => sum + item.deliveryFee,
//         0,
//       );

//       subOrders.push({
//         userId,
//         orderType: "SUB",
//         parentId: masterOrderId,
//         shippingAddressId: addressId,
//         items: vendorItems,
//         subTotal: vendorSubTotal,
//         totalDeliveryFee: vendorDeliveryFee,
//         netAmount: vendorSubTotal + vendorDeliveryFee,
//         paymentMethod,
//         paymentStatus,
//         status: orderStatus,
//       });
//     }

//     await Order.insertMany(subOrders, { session });

//     // ------------------------------------------------
//     // WALLET FINAL PROCESS
//     // ------------------------------------------------

//     if (paymentMethod === "WALLET") {
//       const wallet = await Wallet.findOne({ userId }).session(session);
//       wallet.balance -= grandTotal;
//       await wallet.save({ session });

//       const transaction = await Transaction.create(
//         [
//           {
//             userId,
//             orderId: masterOrderId,
//             amount: grandTotal,
//             paymentMethod: "WALLET",
//             status: "SUCCESS",
//           },
//         ],
//         { session },
//       );
//       transactionId = transaction[0]._id;
//       // master update
//       await Order.findByIdAndUpdate(
//         masterOrderId,
//         {
//           paymentStatus: "PAID",
//           status: "CONFIRMED",
//           transactionId,
//           "items.$[].status": "CONFIRMED",
//         },
//         { session },
//       );

//       // sub orders update
//       await Order.updateMany(
//         {
//           parentId: masterOrderId,
//           orderType: "SUB",
//         },
//         {
//           $set: {
//             paymentStatus: "PAID",
//             status: "CONFIRMED",
//             transactionId,
//             "items.$[].status": "CONFIRMED",
//           },
//         },
//         { session },
//       );
//       // stock update
//       const variantOps = [];
//       const productOps = [];

//       for (const cartItem of cart.items) {
//         variantOps.push({
//           updateOne: {
//             filter: { _id: cartItem.variant._id },
//             update: {
//               $inc: {
//                 stock: -cartItem.quantity,
//                 sold: cartItem.quantity,
//               },
//             },
//           },
//         });

//         productOps.push({
//           updateOne: {
//             filter: { _id: cartItem.variant.productId._id },
//             update: {
//               $inc: {
//                 sold: cartItem.quantity,
//               },
//             },
//           },
//         });
//       }

//       if (variantOps.length) {
//         await Variant.bulkWrite(variantOps, { session });
//       }

//       if (productOps.length) {
//         await Product.bulkWrite(productOps, { session });
//       }
//       // clear cart
//       await Cart.findOneAndUpdate(
//         { userId },
//         {
//           items: [],
//           totalAmount: 0,
//         },
//         { session },
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();

//     if (paymentMethod === "WALLET") {
//       const freshMasterOrder = await Order.findById(masterOrderId);
//       const freshSubOrders = await Order.find({
//         parentId: masterOrderId,
//         orderType: "SUB",
//       });

//       if (freshMasterOrder) {
//         generateOrderInvoices(freshMasterOrder, freshSubOrders).catch((err) =>
//           console.error("[Invoice Generation Failed]", err.message),
//         );
//       }
//     }

//     const cacheKey = `admin:orders:${JSON.stringify(req.query)}`;
//     return res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       masterOrder: masterOrder[0],
//       transactionRef,
//       key: paymentMethod === "WALLET" ? null : process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     next(error);
//   }
// };

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionRef = null;
  let transactionId = null;

  try {
    const userId = req.user.id;

    const { addressId, paymentMethod, items } = req.body;
    if (!addressId || !paymentMethod || !items?.length) {
      throw new APIError(
        400,
        "addressId, paymentMethod and items are required",
      );
    }

    // =====================================================
    // ADDRESS
    // =====================================================

    const address = await Address.findOne({
      _id: addressId,
      userId,
    }).session(session);

    if (!address) {
      throw new APIError(404, "Address not found");
    }

    // =====================================================
    // CART
    // =====================================================

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.variant",
        populate: {
          path: "productId",
          model: "Product",
          select: `
            name
            images
            vendorId
            measurementUnit
          `,
        },
      })
      .session(session);

    if (!cart || !cart.items.length) {
      throw new APIError(400, "Cart is empty");
    }

    // =====================================================
    // STOCK VALIDATION
    // =====================================================

    for (const cartItem of cart.items) {
      if (cartItem.quantity > cartItem.variant.stock) {
        throw new APIError(
          400,
          `Out of stock: ${cartItem.variant.productId.name}`,
        );
      }
    }

    // =====================================================
    // COMPANY BILL SUMMARY
    // =====================================================

    const comapnyBillSummary = await calculateBillSummary(cart.items);

    // =====================================================
    // TOTALS
    // =====================================================

    let subtotal = 0;

    let totalDeliveryFee = 0;

    let totalGST = 0;

    let paymentStatus = "UNPAID";

    let orderStatus = "PENDING";

    const vendorMap = new Map();

    // =====================================================
    // PREPARE ITEMS
    // =====================================================

    for (const cartItem of cart.items) {
      const variant = cartItem.variant;

      const product = variant.productId;

      const selected = items.find(
        (i) => i.variantId === variant._id.toString(),
      );

      if (!selected) continue;

      // =====================================================
      // ITEM TOTAL
      // =====================================================

      const itemTotal = Number(cartItem.quantity) * Number(cartItem.unitPrice);

      subtotal += itemTotal;

      // =====================================================
      // DELIVERY FEE
      // =====================================================

      let deliveryFee = 0;

      if (
        selected.deliveryType === "vendor" ||
        selected.deliveryType === "logistic"
      ) {
        deliveryFee = Number(selected.deliveryFee || 0);
      }

      totalDeliveryFee += deliveryFee;

      // =====================================================
      // GST
      // =====================================================

      const itemWiseGST = (itemTotal * comapnyBillSummary.taxPercentage) / 100;

      totalGST += itemWiseGST;

      // =====================================================
      // VENDOR AMOUNT
      // product price + self/vendor delivery
      // logistic excluded
      // =====================================================

      let vendorAmount = itemTotal;

      if (
        selected.deliveryType === "self" ||
        selected.deliveryType === "vendor"
      ) {
        vendorAmount += deliveryFee;
      }

      const vendorId = product.vendorId.toString();

      // =====================================================
      // PREPARED ITEM
      // =====================================================

      const preparedItem = {
        productId: product._id,

        variantId: variant._id,

        vendorId: product.vendorId,

        quantity: cartItem.quantity,

        price: Number(cartItem.unitPrice.toFixed(2)),

        finalPrice: Number(itemTotal.toFixed(2)),

        packageWeight: variant.packageWeight || 0,

        vendorAmount: Number(vendorAmount.toFixed(2)),

        gstAmount: Number(itemWiseGST.toFixed(2)),

        deliveryType: selected.deliveryType,

        deliveryFee: Number(deliveryFee.toFixed(2)),
        durationTime: selected.durationTime || "",

        distance: {
          km: Number(selected?.distance?.km || 0),
          meter: Number(selected?.distance?.meter || 0),
        },

        status: "PENDING",
      };

      // =====================================================
      // GROUP BY VENDOR
      // =====================================================

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, []);
      }

      vendorMap.get(vendorId).push(preparedItem);
    }

    // =====================================================
    // GRAND TOTAL
    // =====================================================

    const grandTotal =
      subtotal +
      totalDeliveryFee +
      totalGST +
      comapnyBillSummary.handlingCharge;

    // =====================================================
    // WALLET CHECK
    // =====================================================

    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({
        userId,
      }).session(session);

      if (!wallet) {
        throw new APIError(404, "Wallet not found");
      }

      if (wallet.balance < grandTotal) {
        throw new APIError(400, "Insufficient wallet balance");
      }
      paymentStatus = "PAID";
      orderStatus = "CONFIRMED";
    }

    // =====================================================
    // ONLINE PAYMENT
    // =====================================================

    if (paymentMethod === "ONLINE") {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`,

        notes: {
          userId: userId.toString(),
        },
      });

      if (!razorpayOrder) {
        throw new APIError(400, "Failed to create Razorpay order");
      }

      transactionRef = razorpayOrder.id;
    }

    // =====================================================
    // MASTER ORDER
    // =====================================================

    const masterOrder = await Order.create(
      [
        {
          userId,

          orderType: "MASTER",

          shippingAddressId: addressId,

          items: Array.from(vendorMap.values()).flat(),

          subTotal: Number(subtotal.toFixed(2)),

          totalDeliveryFee: Number(totalDeliveryFee.toFixed(2)),

          gstAmount: Number(totalGST.toFixed(2)),

          handlingCharge: Number(comapnyBillSummary.handlingCharge.toFixed(2)),

          netAmount: Number(grandTotal.toFixed(2)),

          paymentMethod,

          paymentStatus,

          status: orderStatus,

          transactionRef,
          expiresAt:
            paymentMethod === "ONLINE"
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
              : null,
        },
      ],
      { session },
    );

    const masterOrderId = masterOrder[0]._id;

    // =====================================================
    // SUB ORDERS
    // =====================================================

    const subOrders = [];

    for (const [vendorId, vendorItems] of vendorMap.entries()) {
      const vendorSubTotal = vendorItems.reduce((sum, item) => {
        return sum + item.finalPrice;
      }, 0);

      const vendorDeliveryFee = vendorItems.reduce((sum, item) => {
        return sum + item.deliveryFee;
      }, 0);

      const vendorGST = vendorItems.reduce((sum, item) => {
        return sum + item.gstAmount;
      }, 0);

      const vendorNetAmount = vendorSubTotal + vendorDeliveryFee + vendorGST;

      subOrders.push({
        userId,

        orderType: "SUB",

        parentId: masterOrderId,

        shippingAddressId: addressId,

        items: vendorItems,

        subTotal: Number(vendorSubTotal.toFixed(2)),

        totalDeliveryFee: Number(vendorDeliveryFee.toFixed(2)),

        gstAmount: Number(vendorGST.toFixed(2)),

        netAmount: Number(vendorNetAmount.toFixed(2)),

        paymentMethod,

        paymentStatus,

        status: orderStatus,
        expiresAt:
          paymentMethod === "ONLINE"
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            : null,
      });
    }

    await Order.insertMany(subOrders, {
      session,
    });

    // =====================================================
    // WALLET PAYMENT PROCESS
    // =====================================================

    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({
        userId,
      }).session(session);

      wallet.balance -= grandTotal;

      await wallet.save({ session });

      const transaction = await Transaction.create(
        [
          {
            userId,

            orderId: masterOrderId,

            amount: Number(grandTotal.toFixed(2)),

            paymentMethod: "WALLET",
            status: "SUCCESS",
            payType: "DEBIT",
            walletPurpose: "ORDER_PAYMENT",
          },
        ],
        { session },
      );

      transactionId = transaction[0]._id;
      await RedisCache.deletePattern(`wallet:history:${userId}:*`);

      // =====================================================
      // MASTER UPDATE
      // =====================================================

      await Order.findByIdAndUpdate(
        masterOrderId,
        {
          paymentStatus: "PAID",

          status: "CONFIRMED",

          transactionId,

          "items.$[].status": "CONFIRMED",
        },
        { session },
      );

      // =====================================================
      // SUB ORDER UPDATE
      // =====================================================

      await Order.updateMany(
        {
          parentId: masterOrderId,

          orderType: "SUB",
        },
        {
          $set: {
            paymentStatus: "PAID",

            status: "CONFIRMED",

            transactionId,

            "items.$[].status": "CONFIRMED",
          },
        },
        { session },
      );

      // =====================================================
      // STOCK UPDATE
      // =====================================================

      const variantOps = [];

      const productOps = [];

      for (const cartItem of cart.items) {
        variantOps.push({
          updateOne: {
            filter: {
              _id: cartItem.variant._id,
            },

            update: {
              $inc: {
                stock: -cartItem.quantity,

                sold: cartItem.quantity,
              },
            },
          },
        });

        productOps.push({
          updateOne: {
            filter: {
              _id: cartItem.variant.productId._id,
            },

            update: {
              $inc: {
                sold: cartItem.quantity,
              },
            },
          },
        });
      }

      if (variantOps.length) {
        await Variant.bulkWrite(variantOps, { session });
      }

      if (productOps.length) {
        await Product.bulkWrite(productOps, { session });
      }

      // =====================================================
      // CLEAR CART
      // =====================================================

      await Cart.findOneAndUpdate(
        { userId },
        {
          items: [],

          totalAmount: 0,
        },
        { session },
      );
    }

    // =====================================================
    // COMMIT
    // =====================================================

    await session.commitTransaction();

    session.endSession();

    // =====================================================
    // INVOICE
    // =====================================================

    if (paymentMethod === "WALLET") {
      await sendAdminNotification({
        title: "New Order Created",
        message: `A new order ${masterOrderId} has been created successfully`,
        type: "ORDER_CREATED",
        color: "green",
        redirectUrl: `/marketplace/orders`,
      });

      const freshMasterOrder = await Order.findById(masterOrderId);

      const freshSubOrders = await Order.find({
        parentId: masterOrderId,

        orderType: "SUB",
      });

      if (freshMasterOrder) {
        generateOrderInvoices(freshMasterOrder, freshSubOrders).catch((err) =>
          console.error("[Invoice Generation Failed]", err.message),
        );
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,

      message: "Order created successfully",

      masterOrder: masterOrder[0],

      transactionRef,

      key: paymentMethod === "WALLET" ? null : process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    await session.abortTransaction();

    session.endSession();

    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const userId = req.user.id;

    // -----------------------------------
    // VALIDATE INPUT
    // -----------------------------------

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new APIError(400, "Payment verification details are required");
    }

    // -----------------------------------
    // VERIFY RAZORPAY SIGNATURE
    // -----------------------------------

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      throw new APIError(400, "Payment verification failed");
    }

    // -----------------------------------
    // FIND MASTER ORDER
    // -----------------------------------

    const masterOrder = await Order.findOne({
      transactionRef: razorpay_order_id,
      orderType: "MASTER",
      userId,
    }).session(session);

    if (!masterOrder) {
      throw new APIError(404, "Master order not found");
    }

    // -----------------------------------
    // FIND SUB ORDERS
    // -----------------------------------

    const subOrders = await Order.find({
      parentId: masterOrder._id,
      orderType: "SUB",
    }).session(session);

    // -----------------------------------
    // CREATE TRANSACTION
    // -----------------------------------

    const transaction = await Transaction.create(
      [
        {
          userId,
          orderId: masterOrder._id,
          amount: masterOrder.netAmount,
          paymentMethod: "ONLINE",
          status: "SUCCESS",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      ],
      { session },
    );
    const transactionId = transaction[0]._id;

    // -----------------------------------
    // UPDATE MASTER + SUB ORDERS
    // -----------------------------------

    await Order.updateMany(
      {
        _id: {
          $in: [masterOrder._id, ...subOrders.map((order) => order._id)],
        },
      },
      {
        $set: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          transactionId,
          expiresAt: null,
          "items.$[].status": "ACCEPTED",
        },
      },
      { session },
    );

    // -----------------------------------
    // STOCK REDUCTION
    // (ONLINE payment ke baad yaha hoga)
    // -----------------------------------

    const variantOps = [];
    const productOps = [];

    for (const subOrder of subOrders) {
      for (const item of subOrder.items) {
        variantOps.push({
          updateOne: {
            filter: {
              _id: item.variantId,
            },
            update: {
              $inc: {
                stock: -item.quantity,
              },
            },
          },
        });

        productOps.push({
          updateOne: {
            filter: {
              _id: item.productId,
            },
            update: {
              $inc: {
                sold: item.quantity,
              },
            },
          },
        });
      }
    }

    if (variantOps.length) {
      await Variant.bulkWrite(variantOps, { session });
    }

    if (productOps.length) {
      await Product.bulkWrite(productOps, { session });
    }

    // -----------------------------------
    // CLEAR CART
    // -----------------------------------

    await Cart.findOneAndUpdate(
      { userId },
      {
        items: [],
        totalAmount: 0,
      },
      { session },
    );
    await redis.del(`cart:${userId}`);
    // -----------------------------------
    // COMMIT
    // -----------------------------------

    await session.commitTransaction();
    session.endSession();

    // -----------------------------------
    // CACHE VERSION UPDATE
    // -----------------------------------

    await redis.incr(`user:orders:version:${userId}`).catch(console.error);

    // -----------------------------------
    // NOTIFICATIONS
    // -----------------------------------

    sendOrderNotificationToUser(masterOrder, "CONFIRMED").catch(console.error);

    subOrders.forEach((subOrder) => {
      sendOrderNotificationToVendor(subOrder).catch(console.error);
    });

    const freshMasterOrder = await Order.findById(masterOrder._id);
    const freshSubOrders = await Order.find({
      parentId: masterOrder._id,
      orderType: "SUB",
    });

    if (freshMasterOrder) {
      generateOrderInvoices(freshMasterOrder, freshSubOrders).catch((err) =>
        console.error("[Invoice Generation Failed]", err.message),
      );
    }

    // generateOrderInvoices(masterOrder, subOrders).catch((err) =>
    //   console.error("[Invoice Generation Failed]", err.message),
    // );

    // -----------------------------------
    // RESPONSE
    // -----------------------------------
    await sendAdminNotification({
      title: "New Order Created",
      message: `A new order ${masterOrder._id} has been created successfully`,
      type: "ORDER_CREATED",
      color: "green",
      redirectUrl: `/marketplace/orders`,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      data: {
        masterOrderId: masterOrder._id,
        paymentId: razorpay_payment_id,
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
      },
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {}

    session.endSession();
    next(error);
  }
};

//user get all order
export const getAllOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      userId,
      orderType: "MASTER",
      paymentStatus: "PAID",
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

        .populate({
          path: "items.productId",
          select: `
            name
            images
            productTypeId
            subcategoryId
          `,
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
        })

        .select("items createdAt invoice")
        .lean(),

      Order.countDocuments(filter),
    ]);

    const formattedOrders = orders.map((order) => {
      return {
        _id: order._id,
        deliveryDate: order.createdAt
          ? new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null,

        items: order.items.map((item) => {
          const product = item.productId || {};
          invoice: order.invoice || null;

          return {
            productId: {
              _id: product._id || null,
              name: product.name || "",
              images: product.images || [],

              productType:
                product.productTypeId?.length > 0
                  ? {
                      _id: product.productTypeId[0]._id || null,
                      name: product.productTypeId[0].typeName || "",
                    }
                  : null,

              // because your data is ARRAY not object
              subCategory:
                product.subcategoryId?.length > 0
                  ? {
                      _id: product.subcategoryId[0]._id || null,
                      name: product.subcategoryId[0].name || "",
                    }
                  : null,
            },

            quantity: item.quantity || 0,
          };
        }),
      };
    });

    const response = {
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders: formattedOrders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
/* ========================== GET ALL ORDERS BY VENDOR ========================== */
// export const getOrdersByVendor = async (req, res, next) => {
//   try {
//     const vandorId = req.params.vendorId;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Version-based cache: incr version on any status change — no redis.keys() needed
//     const version = (await redis.get(`vendor:orders:version:${vandorId}`)) || 1;
//     const cacheKey = `orders:vendor:${vandorId}:v${version}:${JSON.stringify(req.query)}`;
//     const cached = await redis.get(cacheKey);
//     if (cached) return res.status(200).json(JSON.parse(cached));

//     const filter = { vandorId, orderType: "SUB" };
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

//     const now = new Date();

//     const dateRangeMap = {
//       today: () => {
//         const start = new Date(now);
//         start.setHours(0, 0, 0, 0);
//         return { $gte: start };
//       },
//       last7days: () => {
//         const start = new Date(now);
//         start.setDate(start.getDate() - 7);
//         return { $gte: start };
//       },
//       last30days: () => {
//         const start = new Date(now);
//         start.setDate(start.getDate() - 30);
//         return { $gte: start };
//       },
//       last90days: () => {
//         const start = new Date(now);
//         start.setDate(start.getDate() - 90);
//         return { $gte: start };
//       },
//       custom: () => {
//         const range = {};
//         if (req.query.startDate) range.$gte = new Date(req.query.startDate);
//         if (req.query.endDate) {
//           const end = new Date(req.query.endDate);
//           end.setHours(23, 59, 59, 999);
//           range.$lte = end;
//         }
//         return Object.keys(range).length ? range : null;
//       },
//     };

//     const { dateRange } = req.query;
//     if (dateRange && dateRangeMap[dateRange]) {
//       const range = dateRangeMap[dateRange]();
//       if (range) filter.createdAt = range;
//     }

//     // ── Base filter for stats (aggregate needs ObjectId, not string) ──
//     const statsFilter = {
//       vandorId: new mongoose.Types.ObjectId(vandorId),
//       orderType: "SUB",
//     };

//     const [orders, total, revenueResult, pendingCount] = await Promise.all([
//       // 1. Paginated orders list
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate({ path: "items.product", select: "name thumbnail" })
//         .populate({ path: "items.variant", select: "size price stock" })
//         .lean(),

//       // 2. Total orders matching filter (for pagination)
//       Order.countDocuments(filter),

//       // 3. Total revenue — only PAID + DELIVERED orders
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
//             totalRevenue: { $sum: "$totalAmount" },
//           },
//         },
//       ]),

//       // 4. Count of PENDING orders
//       Order.countDocuments({
//         ...statsFilter,
//         status: "PENDING",
//       }),
//     ]);
//     console.log("revenueResult", revenueResult[0]);

//     const totalRevenue = revenueResult[0]?.totalRevenue ?? 0;

//     const response = {
//       success: true,
//       message: "Vendor orders fetched successfully",
//       stats: {
//         totalRevenue, // sum of totalAmount where PAID + DELIVERED
//         pendingCount, // count of PENDING orders
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
//     res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

// Statuses from which a user is NOT allowed to cancel

const NON_CANCELLABLE_STATUSES = [
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "OUT_FOR_DELIVERY",
];

export const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user._id;
    const orderId = req.params.orderId;
    const { reason } = req.body;

    session.startTransaction();

    const masterOrder = await Order.findOne({
      _id: orderId,
      userId,
      orderType: "MASTER",
    }).session(session);

    if (!masterOrder) throw new APIError(404, "Order not found");

    if (NON_CANCELLABLE_STATUSES.includes(masterOrder.status)) {
      throw new APIError(
        400,
        `Order cannot be cancelled — current status is "${masterOrder.status}"`,
      );
    }

    const subOrders = await Order.find({
      parentId: masterOrder._id,
      orderType: "SUB",
    }).session(session);

    const variantOps = [];
    const productOps = [];

    for (const sub of subOrders) {
      for (const item of sub.items) {
        variantOps.push({
          updateOne: {
            filter: { _id: item.variant },
            update: { $inc: { stock: item.quantity, sold: -item.quantity } },
          },
        });

        productOps.push({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { sold: -item.quantity } },
          },
        });
      }
    }

    // Parallel stock restore
    await Promise.all([
      variantOps.length && Variant.bulkWrite(variantOps, { session }),
      productOps.length && Product.bulkWrite(productOps, { session }),
    ]);

    const subIds = subOrders.map((o) => o._id);

    // Single update for all orders
    await Order.updateMany(
      { _id: { $in: [masterOrder._id, ...subIds] } },
      {
        $set: {
          status: "CANCELLED",
          reason: reason || "Cancelled by customer",
          cancleBy: "CUSTOMER",
          "items.$[].status": "CANCELLED",
        },
      },
      { session },
    );

    // Refund logic
    if (
      masterOrder.paymentStatus === "PAID" &&
      ["WALLET", "ONLINE"].includes(masterOrder.paymentMethod)
    ) {
      await Promise.all([
        Wallet.findOneAndUpdate(
          { userId },
          { $inc: { balance: masterOrder.totalAmount } },
          { session, upsert: true },
        ),

        Transaction.create(
          [
            {
              userId,
              orderId: masterOrder._id,
              amount: masterOrder.totalAmount,
              paymentMethod: masterOrder.paymentMethod,
              status: "SUCCESS",
              payType: "CREDIT",
              walletPurpose: "ORDER_REFUND",
            },
          ],
          { session },
        ),

        Order.updateMany(
          { _id: { $in: [masterOrder._id, ...subIds] } },
          { $set: { paymentStatus: "REFUNDED" } },
          { session },
        ),
      ]);
    }

    await session.commitTransaction();
    session.endSession();

    redis.del(`orders:user:${userId}`).catch(() => {});

    setImmediate(() => {
      creditNoteInvoice(masterOrder)
        .then((pdfUrl) =>
          Order.updateOne(
            { _id: masterOrder._id },
            { $set: { creditNote: pdfUrl } },
          ),
        )
        .catch((err) =>
          console.error("[CreditNote] Generation failed:", err.message),
        );
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const vendorUpdateOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vandorId = req.user.id;
    const { subOrderId } = req.params;
    const { action, reason } = req.body;

    if (!["ACCEPT", "REJECT"].includes(action)) {
      throw new APIError(400, "action must be ACCEPT or REJECT");
    }

    const newStatus =
      action === "ACCEPT" ? "VENDOR_CONFIRMED" : "VENDOR_CANCELLED";

    // Step 1: find the sub order by ID alone first
    const subOrder = await Order.findOne({
      _id: subOrderId,
      orderType: "SUB",
    }).session(session);

    if (!subOrder) throw new APIError(404, "Sub order not found");

    // Step 2: check this order belongs to the requesting vendor
    if (subOrder.vandorId.toString() !== vandorId.toString()) {
      throw new APIError(
        403,
        "You do not have permission to update this order",
      );
    }

    // Step 3: validate the current status is actionable
    if (!["CONFIRMED", "PENDING"].includes(subOrder.status)) {
      throw new APIError(
        400,
        `Order cannot be updated — current status is "${subOrder.status}"`,
      );
    }

    // Step 4: apply the update
    await Order.updateOne(
      { _id: subOrder._id },
      {
        $set: {
          status: newStatus,
          reason: reason || null,
          cancleBy: action === "REJECT" ? "VANDOR" : null,
          "items.$[].status": newStatus,
        },
      },
      { session },
    );

    if (action === "REJECT") {
      const variantOps = subOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.variant },
          update: { $inc: { stock: item.quantity, sold: -item.quantity } },
        },
      }));

      const productOps = subOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { sold: -item.quantity } },
        },
      }));

      if (variantOps.length) await Variant.bulkWrite(variantOps, { session });
      if (productOps.length) await Product.bulkWrite(productOps, { session });
    }

    const remainingDifferentStatus = await Order.countDocuments({
      parentId: subOrder.parentId,
      orderType: "SUB",
      status: { $ne: newStatus },
    }).session(session);

    const masterStatus =
      remainingDifferentStatus === 0 ? newStatus : "MULTI_STATE";

    await Order.updateOne(
      { _id: subOrder.parentId },
      {
        $set: {
          status: masterStatus,
          "items.$[item].status": newStatus,
        },
      },
      {
        session,
        arrayFilters: [
          { "item.variant": { $in: subOrder.items.map((i) => i.variant) } },
        ],
      },
    );

    await session.commitTransaction();
    session.endSession();

    // Version bump — old cache keys become unreachable, expire naturally with TTL
    await redis.incr(`vendor:orders:version:${vandorId}`);

    return res.status(200).json({
      success: true,
      message:
        action === "ACCEPT"
          ? "Order accepted successfully"
          : "Order rejected successfully",
      subOrderStatus: newStatus,
      masterOrderStatus: masterStatus,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/* ========================== GET ORDER BY ID (USER) ========================== */
// export const getOrderById = async (req, res, next) => {
//   try {
//     const userId = req.user._id;
//     const { orderId } = req.params;

//     const version = (await redis.get(`order:version:${orderId}`)) || 1;

//     const cacheKey = `order:${orderId}:user:${userId}:v${version}`;

//     const cached = await redis.get(cacheKey);
//     if (cached) return res.status(200).json(JSON.parse(cached));

//     const masterOrder = await Order.findOne({
//       _id: orderId,
//       userId,
//     })
//       .populate({
//         path: "items.product",
//         select: "name thumbnail",
//       })
//       .populate({
//         path: "items.variant",
//         select: "size price mrp discount",
//       })
//       .lean();

//     if (!masterOrder) throw new APIError(404, "Order not found");

//     const transactionPromise = Transaction.findById(masterOrder.transactionId)
//       .select("amount status paymentMethod razorpayOrderId createdAt")
//       .lean();

//     const [transaction] = await Promise.all([transactionPromise]);

//     masterOrder.transactionId = transaction;

//     const response = {
//       success: true,
//       message: "Order fetched successfully",
//       data: {
//         order: { ...masterOrder },
//       },
//     };

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

//asgr-invoice nhi h
// export const getOrderById = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { orderId } = req.params;

//     // =========================
//     // Redis Cache Version
//     // =========================

//     // const version = (await redis.get(`order:version:${orderId}`)) || 1;

//     // const cacheKey = `order:${orderId}:user:${userId}:v${version}`;

//     // const cached = await redis.get(cacheKey);

//     // if (cached) {
//     //   return res.status(200).json(JSON.parse(cached));
//     // }

//     // =========================
//     // Fetch Master Order
//     // =========================

//     const masterOrder = await Order.findOne({
//       _id: orderId,
//       userId,
//       orderType: "MASTER",
//     })
//       .select("+invoice")
//       // product details
//       .populate({
//         path: "items.productId",
//         select: `
//           name
//           images
//           categoryId
//           pcategoryId
//           subcategoryId
//           productTypeId
//           brandId
//         `,
//         populate: [
//           {
//             path: "categoryId",
//             select: "name",
//           },
//           {
//             path: "pcategoryId",
//             select: "name",
//           },
//           {
//             path: "subcategoryId",
//             select: "name",
//           },
//           {
//             path: "productTypeId",
//             select: "typeName",
//           },
//           {
//             path: "brandId",
//             select: "name",
//           },
//         ],
//       })

//       // variant details
//       .populate({
//         path: "items.variantId",
//         select: `
//           price
//           packageWeight
//           packageDimensions
//           stock
//           sold
//         `,
//       })

//       // vendor profile details
//       .populate({
//         path: "items.vendorId",
//         select: `
//           firstName
//           lastName
//           email
//           phoneNumber
//         `,
//       })

//       // user details
//       .populate({
//         path: "userId",
//         select: `
//           name
//           email
//           phone
//         `,
//       })

//       // shipping address
//       .populate({
//         path: "shippingAddressId",
//         select: `
//           label
//           userName
//           addressLine
//           country
//           state
//           city
//           pincode
//           landMark
//         `,
//       })
//       .lean();

//     if (!masterOrder) {
//       throw new APIError(404, "Order not found");
//     }

//     // =========================
//     // Fetch Vendor Company Details
//     // =========================

//     const vendorIds = [];

//     masterOrder.items.forEach((item) => {
//       const vendorProfileId =
//         item.vendorId?._id?.toString() || item.vendorId?.toString();

//       if (vendorProfileId) {
//         vendorIds.push(vendorProfileId);
//       }
//     });

//     const vendorCompanies = await VendorCompany.find({
//       vendorId: { $in: vendorIds },
//     })
//       .select(
//         `
//         companyName
//         contactNumber
//         businessAddress
//         vendorId
//       `,
//       )
//       .lean();

//     const companyMap = {};

//     vendorCompanies.forEach((company) => {
//       companyMap[company.vendorId.toString()] = company;
//     });

//     // attach company details inside each item
//     masterOrder.items.forEach((item) => {
//       const vendorProfileId =
//         item.vendorId?._id?.toString() || item.vendorId?.toString();

//       item.vendorCompany = companyMap[vendorProfileId] || null;
//     });
//     let transaction = null;

//     if (masterOrder.transactionId) {
//       transaction = await Transaction.findById(masterOrder.transactionId)
//         .select(
//           `
//           amount
//           status
//           paymentMethod
//           razorpayOrderId
//           createdAt
//         `,
//         )
//         .lean();
//     }

//     masterOrder.transactionId = transaction;

//     const response = {
//       success: true,
//       message: "Order fetched successfully",
//       data: {
//         order: masterOrder,
//       },
//     };

//     // await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     return res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

//user get own order with details
export const getOrderById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // =========================
    // Fetch Master Order
    // =========================

    const masterOrder = await Order.findOne({
      _id: orderId,
      userId,
      orderType: "MASTER",
    })
      .select(
        `
        invoice
        userId
        orderType
        parentId
        items
        shippingAddressId
        subTotal
        totalDeliveryFee
        netAmount
        status
        paymentStatus
        paymentMethod
        transactionRef
        transactionId
        createdAt
        updatedAt
      `,
      )

      // Product Details
      .populate({
        path: "items.productId",
        select: `
          name
          images
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

      // Variant Details
      .populate({
        path: "items.variantId",
        select: `
          price
          packageWeight
          packageDimensions
          stock
          sold
        `,
      })

      // Vendor Profile Details
      .populate({
        path: "items.vendorId",
        select: `
          firstName
          lastName
          email
          phoneNumber
        `,
      })

      // User Details
      .populate({
        path: "userId",
        select: `
          name
          email
          phone
        `,
      })

      // Shipping Address
      .populate({
        path: "shippingAddressId",
        select: `
          label
          userName
          addressLine
          country
          state
          city
          pincode
          landMark
        `,
      })

      .lean();

    if (!masterOrder) {
      throw new APIError(404, "Order not found");
    }

    // =========================
    // Fetch Vendor Company Details
    // =========================

    const vendorIds = [];

    masterOrder.items.forEach((item) => {
      const vendorProfileId =
        item.vendorId?._id?.toString() || item.vendorId?.toString();

      if (vendorProfileId) {
        vendorIds.push(vendorProfileId);
      }
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

    // Attach company details inside each item
    masterOrder.items.forEach((item) => {
      const vendorProfileId =
        item.vendorId?._id?.toString() || item.vendorId?.toString();

      item.vendorCompany = companyMap[vendorProfileId] || null;
    });

    // =========================
    // Fetch Transaction Details
    // =========================

    let transaction = null;

    if (masterOrder.transactionId) {
      transaction = await Transaction.findById(masterOrder.transactionId)
        .select(
          `
          amount
          status
          paymentMethod
          razorpayOrderId
          createdAt
        `,
        )
        .lean();
    }

    masterOrder.transactionId = transaction;
    // Debug check
    // console.log("invoice =>", masterOrder.invoice);

    const response = {
      success: true,
      message: "Order fetched successfully",
      data: {
        order: masterOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//admin get all orders
// export const adminGetAllOrders = async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const cacheKey = `admin:orders:${JSON.stringify(req.query)}`;
//     const cached = await redis.get(cacheKey);
//     if (cached) return res.status(200).json(JSON.parse(cached));

//     const filter = {};
//     if (req.query.orderType) filter.orderType = req.query.orderType;
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
//     if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

//     if (req.query.search) {
//       filter._id = { $regex: `^${req.query.search}`, $options: "i" };
//     }

//     const now = new Date();
//     const dateRangeMap = {
//       today: () => {
//         const s = new Date(now);
//         s.setHours(0, 0, 0, 0);
//         return { $gte: s };
//       },
//       last7days: () => {
//         const s = new Date(now);
//         s.setDate(s.getDate() - 7);
//         return { $gte: s };
//       },
//       last30days: () => {
//         const s = new Date(now);
//         s.setDate(s.getDate() - 30);
//         return { $gte: s };
//       },
//       last90days: () => {
//         const s = new Date(now);
//         s.setDate(s.getDate() - 90);
//         return { $gte: s };
//       },
//       custom: () => {
//         const range = {};
//         if (req.query.startDate) range.$gte = new Date(req.query.startDate);
//         if (req.query.endDate) {
//           const end = new Date(req.query.endDate);
//           end.setHours(23, 59, 59, 999);
//           range.$lte = end;
//         }
//         return Object.keys(range).length ? range : null;
//       },
//     };

//     const { dateRange } = req.query;
//     if (dateRange && dateRangeMap[dateRange]) {
//       const range = dateRangeMap[dateRange]();
//       if (range) filter.createdAt = range;
//     }

//     const [orders, total] = await Promise.all([
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate({ path: "userId", select: "name email phone" })
//         .populate({ path: "items.product", select: "name thumbnail" })
//         // .populate({ path: "vandorId", select: "name email" })
//         .lean(),
//       Order.countDocuments(filter),
//     ]);

//     const response = {
//       success: true,
//       message: "Orders fetched successfully",
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

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 120);
//     res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };
export const adminGetAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `admin:orders:${JSON.stringify(req.query)}`;

    // Check Redis Cache
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Filters
    const filter = {
      paymentStatus: "PAID",
    };

    if (req.query.orderType) {
      filter.orderType = req.query.orderType;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    // Search by Order ID
    if (req.query.search) {
      filter._id = {
        $regex: `^${req.query.search}`,
        $options: "i",
      };
    }

    // Date Filters
    const now = new Date();

    const dateRangeMap = {
      today: () => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        return {
          $gte: start,
        };
      },

      last7days: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);

        return {
          $gte: start,
        };
      },

      last30days: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);

        return {
          $gte: start,
        };
      },

      last90days: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);

        return {
          $gte: start,
        };
      },

      custom: () => {
        const range = {};

        if (req.query.startDate) {
          range.$gte = new Date(req.query.startDate);
        }

        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          end.setHours(23, 59, 59, 999);

          range.$lte = end;
        }

        return Object.keys(range).length ? range : null;
      },
    };

    const { dateRange } = req.query;

    if (dateRange && dateRangeMap[dateRange]) {
      const range = dateRangeMap[dateRange]();

      if (range) {
        filter.createdAt = range;
      }
    }

    // Fetch Orders + Count
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

        // User Details
        .populate({
          path: "userId",
          select: "name email phone",
        })

        // Product Details
        .populate({
          path: "items.productId",
          select: "name thumbnail",
        })

        // Variant Details
        .populate({
          path: "items.variantId",
          select: "Type price finalPrice",
        })

        // Vendor Details
        .populate({
          path: "items.vendorId",
          select: "firstName lastName email phoneNumber",
        })

        // Address
        .populate({
          path: "shippingAddressId",
        })

        .lean(),

      Order.countDocuments(filter),
    ]);

    // Response
    const response = {
      success: true,

      message: "Orders fetched successfully",

      data: {
        orders,

        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    // Store in Redis
    await redis.set(cacheKey, JSON.stringify(response), "EX", 120);

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const adminGetOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const cacheKey = `admin:order-details:${orderId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Find order by _id or items._id
    let order = await Order.findOne({
      $or: [{ _id: orderId }, { "items._id": orderId }],
    })
      .populate({
        path: "userId",
        select: "name firstName lastName email phone gender",
      })
      .populate({
        path: "items.productId",
        select: "name images",
      })
      .populate({
        path: "items.variantId",
        select: "name Type moq price mrp ",
      })
      .populate({
        path: "items.vendorId",
        select: "firstName lastName email phoneNumber avgRating",
      })
      .populate({
        path: "shippingAddressId",
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the orderId is a sub-order (item._id)
    let isSubOrder = false;
    let matchedItem = null;
    if (order.items && Array.isArray(order.items)) {
      matchedItem = order.items.find(
        (item) => String(item?._id) === String(orderId),
      );
      isSubOrder = !!matchedItem;
    }

    // Format items
    const itemsToFormat = isSubOrder ? [matchedItem] : order.items || [];
    const formattedItems = itemsToFormat.map((item) => ({
      itemId: item?._id || null,
      product: item?.productId
        ? {
            id: item.productId?._id || null,
            name: item.productId?.name || "N/A",
            images: item.productId?.images || null,
          }
        : {
            id: null,
            name: "Product Deleted",
            images: null,
          },
      variant: item?.variantId
        ? {
            id: item.variantId?._id || null,
            type: item.variantId?.Type || "N/A",
            price: item.variantId?.price || "N/A",
            moq: item.variantId?.moq || "N/A",
          }
        : {
            id: null,
            name: "Variant Deleted",
            type: "N/A",
            price: item.variantId?.price || "N/A",
          },
      vendor: item?.vendorId
        ? {
            id: item.vendorId?._id || null,
            name:
              `${item.vendorId?.firstName || ""} ${item.vendorId?.lastName || ""}`.trim() ||
              "Vendor Name Not Found",
            email: item.vendorId?.email || "N/A",
            phone: item.vendorId?.phoneNumber || "N/A",
            avgRating: item.vendorId?.avgRating || 0,
          }
        : {
            id: null,
            name: "Vendor Deleted",
            email: "N/A",
            phone: "N/A",
            avgRating: 0,
          },
      quantity: item?.quantity || 0,
      price: item?.price || 0,
      finalPrice: item?.finalPrice || 0,
      vendorAmount: item?.vendorAmount || 0,
      gstAmount: item?.gstAmount || 0,
      deliveryFee: item?.deliveryFee || 0,
      deliveryType: item?.deliveryType || "N/A",
      status: item?.status || "N/A",
    }));

    // Build response
    const response = {
      success: true,
      message: isSubOrder
        ? "Sub order details fetched successfully"
        : "Master order details fetched successfully",
      data: {
        isSubOrder,
        masterOrderId: order?._id || null,
        requestedId: orderId,
        orderType: order?.orderType || "N/A",
        status: order?.status || "N/A",
        paymentStatus: order?.paymentStatus || "N/A",
        paymentMethod: order?.paymentMethod || "N/A",
        createdAt: order?.createdAt || null,
        updatedAt: order?.updatedAt || null,
        transactionId: order?.transactionId || null,
        invoice: order?.invoice || null,
        pricing: {
          subTotal: order?.subTotal || 0,
          totalDeliveryFee: order?.totalDeliveryFee || 0,
          handlingCharge: order?.handlingCharge || 0,
          discountAmount: order?.discountAmount || 0,
          netAmount: order?.netAmount || 0,
        },
        customer: order?.userId
          ? {
              id: order.userId?._id || null,
              name:
                order.userId?.name ||
                `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() ||
                "N/A",
              email: order.userId?.email || "N/A",
              phone: order.userId?.phone || "N/A",
              gender: order.userId?.gender || "N/A",
            }
          : {
              id: null,
              name: "User Deleted",
              email: "N/A",
              phone: "N/A",
              gender: "N/A",
            },
        shippingAddress: order?.shippingAddressId
          ? {
              id: order.shippingAddressId?._id || null,
              fullName: order.shippingAddressId?.userName || "N/A",
              addressLine: order.shippingAddressId?.addressLine || "N/A",
              city: order.shippingAddressId?.city || "N/A",
              country: order.shippingAddressId?.country || "N/A",
              location: order.shippingAddressId?.location || "N/A",
            }
          : null,
        items: formattedItems,
      },
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 120);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const ITEM_VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "VENDOR_CONFIRMED",
  "VENDOR_CANCELLED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

// Statuses that require stock to be restored
const STOCK_RESTORE_STATUSES = new Set(["CANCELLED", "RETURNED"]);

export const updateSingleProductStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { subOrderId, variantId, status } = req.body;
    const isAdmin = req.user.role === "ADMIN";
    const actorId = req.user._id;

    const variantObjectId = new mongoose.Types.ObjectId(variantId);

    const subOrderQuery = { _id: subOrderId, orderType: "SUB" };
    if (!isAdmin) subOrderQuery.vandorId = actorId;

    const subOrder = await Order.findOne(subOrderQuery).session(session).lean();

    if (!subOrder)
      throw new APIError(
        404,
        "Sub-order not found or you do not have access to it",
      );

    const targetItem = subOrder.items.find(
      (it) => it.variant?.toString() === variantObjectId.toString(),
    );

    if (!targetItem)
      throw new APIError(
        404,
        `Variant "${variantId}" does not exist in this sub-order`,
      );

    await Order.updateOne(
      { _id: subOrderId },
      { $set: { "items.$[elem].status": status } },
      {
        session,
        arrayFilters: [{ "elem.variant": variantObjectId }],
      },
    );

    subOrder.items.forEach((it) => {
      if (it.variant.toString() === variantObjectId.toString()) {
        it.status = status;
      }
    });

    const uniqueItemStatuses = [
      ...new Set(subOrder.items.map((it) => it.status)),
    ];

    const newSubStatus =
      uniqueItemStatuses.length === 1 ? uniqueItemStatuses[0] : "MULTI_STATE";

    const masterOrderId = subOrder.parentId;

    const hasDifferentStatus = await Order.exists({
      parentId: masterOrderId,
      orderType: "SUB",
      _id: { $ne: subOrderId },
      status: { $ne: newSubStatus },
    }).session(session);

    const newMasterStatus = hasDifferentStatus ? "MULTI_STATE" : newSubStatus;

    const masterUpdate = {
      status: newMasterStatus,
    };

    if (newMasterStatus === "DELIVERED") {
      masterUpdate.deliveredDate = new Date();
    }

    await Order.bulkWrite(
      [
        {
          updateOne: {
            filter: { _id: subOrderId },
            update: { $set: { status: newSubStatus } },
          },
        },
        {
          updateOne: {
            filter: { _id: masterOrderId },
            update: {
              $set: {
                "items.$[elem].status": status,
                ...masterUpdate,
              },
            },
            arrayFilters: [{ "elem.variant": variantObjectId }],
          },
        },
      ],
      { session },
    );

    if (STOCK_RESTORE_STATUSES.has(status)) {
      const qty = targetItem.quantity;

      await Promise.all([
        Variant.updateOne(
          { _id: variantObjectId },
          { $inc: { stock: qty, sold: -qty } },
          { session },
        ),
        Product.updateOne(
          { _id: targetItem.product },
          { $inc: { sold: -qty } },
          { session },
        ),
      ]);
    }

    await session.commitTransaction();
    session.endSession();

    const vendorId = subOrder.vandorId.toString();
    const userId = subOrder.userId.toString();

    Promise.all([
      redis.incr(`user:orders:version:${userId}`),
      redis.incr(`vendor:orders:version:${vendorId}`),
      redis.incr(`order:version:${masterOrderId.toString()}`),
    ]).catch(console.error);

    return res.status(200).json({
      success: true,
      message: `Item status updated to "${status}"`,
      data: {
        variantId,
        itemStatus: status,
        subOrderId,
        subOrderStatus: newSubStatus,
        masterOrderId,
        masterStatus: newMasterStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const updateAllProductsStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { subOrderId, status } = req.body;
    const isAdmin = req.user.role === "ADMIN";
    const actorId = req.user._id;

    const subOrderQuery = { _id: subOrderId, orderType: "SUB" };
    if (!isAdmin) subOrderQuery.vandorId = actorId;

    const subOrder = await Order.findOne(subOrderQuery, {
      parentId: 1,
      items: 1,
      userId: 1,
      vandorId: 1,
    }).session(session);
    if (!subOrder)
      throw new APIError(
        404,
        "Sub-order not found or you do not have access to it",
      );

    const masterOrderId = subOrder.parentId;
    const variantIds = subOrder.items.map((it) => it.variant).filter(Boolean);

    await Order.updateOne(
      { _id: subOrderId },
      { $set: { status, "items.$[].status": status } },
      { session },
    );

    if (variantIds.length > 0) {
      await Order.updateOne(
        { _id: masterOrderId },
        { $set: { "items.$[elem].status": status } },
        { session, arrayFilters: [{ "elem.variant": { $in: variantIds } }] },
      );
    }

    // ── Recalculate master order status ──────────────────────────────────
    const allSubOrders = await Order.find(
      { parentId: masterOrderId, orderType: "SUB" },
      { status: 1 },
    ).session(session);

    const uniqueStatuses = [
      ...new Set(
        allSubOrders.map((s) => (s._id.equals(subOrderId) ? status : s.status)),
      ),
    ];
    const newMasterStatus =
      uniqueStatuses.length === 1 ? uniqueStatuses[0] : "MULTI_STATE";
    const masterUpdate = { status: newMasterStatus };
    if (newMasterStatus === "DELIVERED")
      masterUpdate.deliveredDate = new Date();

    await Order.updateOne(
      { _id: masterOrderId },
      { $set: masterUpdate },
      { session },
    );

    // ── Stock restoration (CANCELLED / RETURNED) ─────────────────────────
    if (STOCK_RESTORE_STATUSES.has(status) && subOrder.items.length > 0) {
      const variantOps = subOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.variant },
          update: { $inc: { stock: item.quantity, sold: -item.quantity } },
        },
      }));
      const productOps = subOrder.items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { sold: -item.quantity } },
        },
      }));
      await Promise.all([
        Variant.bulkWrite(variantOps, { session }),
        Product.bulkWrite(productOps, { session }),
      ]);
    }

    await session.commitTransaction();
    session.endSession();
    const vendorId = subOrder.vandorId;
    console.log("VendorId:", vendorId);

    await Promise.all([
      redis.incr(`user:orders:version:${subOrder.userId}`),
      redis.incr(`vendor:orders:version:${vendorId}`),
      redis.incr(`order:version:${masterOrderId}`),
    ]);

    return res.status(200).json({
      success: true,
      message: `All ${subOrder.items.length} item(s) in sub-order updated to "${status}"`,
      data: {
        subOrderId,
        subOrderStatus: status,
        masterOrderId,
        masterStatus: newMasterStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

import { shippingQueue } from "../../config/bullmq.config.js";
export const createShippingLabel = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new APIError(404, "Order not found");
    }

    // Push job to the background queue
    await shippingQueue.add("generate-label", { orderId: order._id });

    return res.status(202).json({
      success: true,
      message: "Shipping label generation started in background",
      orderId: order._id,
    });
  } catch (error) {
    next(error);
  }
};
import { addSettlement } from "../vendorShop/vendorWallet.controller.js";
import RedisCache from "../../utils/redisCache.js";
import adminNotificationModel from "../../models/admin/adminNotification.model.js";
import { sendAdminNotification } from "../../services/adminNotification.service.js";
export const updateOrderToDelivered = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Order is already delivered",
      });
    }
    order.status = "DELIVERED";
    order.deliveredDate = Date.now();
    const updatedOrder = await order.save();
    //Settlement funds will remain in the vendor's wallet for 7 days before a withdrawal request can be made.
    if (order.paymentStatus === "PAID") {
      await addSettlement(order.vendorId, order._id, order.totalAmount);
    }

    // Optional: Send notifications
    // await notifyVendor(order.vendorId, 'ORDER_DELIVERED', order._id);
    // await notifyCustomer(order.customerId, 'ORDER_DELIVERED', order._id);

    res.status(200).json({
      success: true,
      message: "Order marked as delivered",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
