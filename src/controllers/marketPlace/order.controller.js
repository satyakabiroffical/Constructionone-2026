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


// const calculateVendorSplit = async (cartItems) => {
//     const vendorMap = new Map();

//     for (const item of cartItems) {
//         const product = item.variant.productId; // populated
//         const vendorId = product.createdBy.toString();

//         if (!vendorMap.has(vendorId)) {
//             vendorMap.set(vendorId, []);
//         }
//         vendorMap.get(vendorId).push(item);
//     }

//     const splitdata = [];
//     let grandTotal = 0;

//     for (const [vendorId, items] of vendorMap) {
//         const billSummary = await calculateBillSummary(items);
//         splitdata.push({
//             vendorId,
//             items,
//             billSummary
//         });
//         grandTotal += billSummary.grandTotal;
//     }

//     return { splitdata, grandTotal };
// };


// export const createOrder = async (req, res, next) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         const userId = req.user._id;
//         const { shippingAddress, paymentMethod } = req.body;

//         if (!shippingAddress || !paymentMethod) {
//             return next(new APIError(400, "Shipping address and payment method required"));
//         }

//         // 1. Get Cart
//         const cart = await Cart.findOne({ userId }).populate({
//             path: "items.variant",
//             populate: {
//                 path: "productId",
//                 model: "Product"
//             }
//         }).session(session);

//         if (!cart || cart.items.length === 0) {
//             return next(new APIError(400, "Cart is empty"));
//         };
//         for (const item of cart.items) {
//             if (item.quantity > item.variant.stock) {
//                 return next(new APIError(400, `Out of stock: ${item.variant.productId.name}`));
//             }
//         };
//         const { splitdata, grandTotal } = await calculateVendorSplit(cart.items);

//         let masterOrder;
//         const subOrders = [];
//         let transactionId = null;

//         const allItemsSnapshot = cart.items.map(item => ({
//             product: item.variant.productId._id,
//             variant: item.variant._id,
//             price: item.unitPrice,
//             quantity: item.quantity,
//         }));

//         if (paymentMethod === "COD") {
//             masterOrder = new Order({
//                 userId,
//                 items: allItemsSnapshot,
//                 totalAmount: grandTotal,
//                 netAmount: splitdata.reduce((total, data) => total + data.billSummary.itemsTotal, 0),
//                 shippingAddress,
//                 status: "CONFIRMED",
//                 paymentStatus: "UNPAID",
//                 paymentMethod: "COD",
//                 orderType: "MASTER",
//             });
//             await masterOrder.save({ session });

//             const transaction = new Transaction({
//                 userId,
//                 orderId: masterOrder._id,
//                 amount: grandTotal,
//                 paymentMethod: "COD",
//                 status: "PENDING",
//                 walletPurpose: "ORDER_PAYMENT"
//             });
//             await transaction.save({ session });
//             transactionId = transaction._id;

//             masterOrder.transactionId = transactionId;
//             await masterOrder.save({ session });

//             for (const data of splitdata) {
//                 const order = new Order({
//                     userId,
//                     items: data.items.map(item => ({
//                         product: item.variant.productId._id,
//                         variant: item.variant._id,
//                         price: item.unitPrice,
//                         quantity: item.quantity,
//                     })),
//                     vandorId: data.vendorId,
//                     totalAmount: data.billSummary.grandTotal,
//                     netAmount: data.billSummary.itemsTotal,
//                     shippingAddress,
//                     status: "CONFIRMED",
//                     paymentStatus: "UNPAID",
//                     paymentMethod: "COD",
//                     orderType: "SUB",
//                     parentId: masterOrder._id,
//                     transactionId
//                 });
//                 await order.save({ session });
//                 subOrders.push(order);

//                 for (const item of data.items) {
//                     await Variant.findByIdAndUpdate(item.variant._id, {
//                         $inc: { stock: -item.quantity, sold: item.quantity }
//                     }, { session });
//                     await Product.findByIdAndUpdate(item.variant.productId._id, {
//                         $inc: { sold: item.quantity }
//                     }, { session });
//                 }
//             }

//         } else if (paymentMethod === "WALLET") {
//             const wallet = await Wallet.findOne({ userId }).session(session);
//             console.log(userId);
//             console.log(wallet);
//             if (!wallet || wallet.balance < grandTotal) {
//                 return next(new APIError(400, "Insufficient wallet balance"));
//             }

//             wallet.balance -= grandTotal;
//             await wallet.save({ session });

//             masterOrder = new Order({
//                 userId,
//                 items: allItemsSnapshot,
//                 totalAmount: grandTotal,
//                 netAmount: splitdata.reduce((total, data) => total + data.billSummary.itemsTotal, 0),
//                 shippingAddress,
//                 status: "CONFIRMED",
//                 paymentStatus: "PAID",
//                 paymentMethod: "WALLET",
//                 orderType: "MASTER",
//             });
//             await masterOrder.save({ session });

//             const transaction = new Transaction({
//                 userId,
//                 orderId: masterOrder._id,
//                 amount: grandTotal,
//                 paymentMethod: "WALLET",
//                 status: "SUCCESS",
//                 payType: "DEBIT",
//                 walletPurpose: "ORDER_PAYMENT"
//             });
//             await transaction.save({ session });
//             transactionId = transaction._id;

//             masterOrder.transactionId = transactionId;
//             await masterOrder.save({ session });

//             for (const data of splitdata) {
//                 const order = new Order({
//                     userId,
//                     items: data.items.map(item => ({
//                         product: item.variant.productId._id,
//                         variant: item.variant._id,
//                         price: item.unitPrice,
//                         quantity: item.quantity,
//                     })),
//                     vandorId: data.vendorId,
//                     totalAmount: data.billSummary.grandTotal,
//                     shippingAddress,
//                     status: "CONFIRMED",
//                     paymentStatus: "PAID",
//                     paymentMethod: "WALLET",
//                     transactionId,
//                     orderType: "SUB",
//                     parentId: masterOrder._id
//                 });
//                 await order.save({ session });
//                 subOrders.push(order);

//                 for (const item of data.items) {
//                     await Variant.findByIdAndUpdate(item.variant._id, {
//                         $inc: { stock: -item.quantity, sold: item.quantity }
//                     }, { session });
//                     await Product.findByIdAndUpdate(item.variant.productId._id, {
//                         $inc: { sold: item.quantity }
//                     }, { session });
//                 }
//             }

//         } else if (paymentMethod === "ONLINE") {
//             const options = {
//                 amount: (grandTotal * 100), // paise
//                 currency: "INR",
//                 receipt: `receipt_${Date.now()}`
//             };

//             const razorpayOrder = await razorpayInstance.orders.create(options);

//             masterOrder = new Order({
//                 userId,
//                 items: allItemsSnapshot,
//                 totalAmount: grandTotal,
//                 netAmount: grandTotal,
//                 shippingAddress,
//                 status: "PENDING",
//                 paymentStatus: "UNPAID",
//                 paymentMethod: "ONLINE",
//                 orderType: "MASTER",
//                 transactionRef: razorpayOrder.id // Store RP Order ID on Master
//             });
//             await masterOrder.save({ session });

//             for (const data of splitdata) {
//                 const order = new Order({
//                     userId,
//                     items: data.items.map(item => ({
//                         product: item.variant.productId._id,
//                         variant: item.variant._id,
//                         price: item.unitPrice,
//                         quantity: item.quantity,
//                     })),
//                     vandorId: data.vendorId,
//                     totalAmount: data.billSummary.grandTotal,
//                     shippingAddress,
//                     status: "PENDING",
//                     paymentStatus: "UNPAID",
//                     paymentMethod: "ONLINE",
//                     orderType: "SUB",
//                     parentId: masterOrder._id,
//                     transactionRef: razorpayOrder.id
//                 });
//                 await order.save({ session });
//                 subOrders.push(order);
//             }

//             await session.commitTransaction();
//             session.endSession();

//             return res.status(200).json({
//                 success: true,
//                 message: "Razorpay order created",
//                 razorpayOrder,
//                 masterOrderId: masterOrder._id,
//                 subOrderIds: subOrders.map(o => o._id)
//             });
//         } else {
//             return next(new APIError(400, "Invalid payment method"));
//         }

//         // Clear Cart for COD/WALLET
//         if (paymentMethod !== "ONLINE") {
//             cart.items = [];
//             cart.totalAmount = 0;
//             await cart.save({ session });
//         }

//         await session.commitTransaction();
//         session.endSession();

//         res.status(201).json({
//             success: true,
//             message: "Order created successfully",
//             masterOrder,
//             subOrders
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         next(error);
//     }
// };

const calculateVendorSplit = async (cartItems) => {
    const vendorMap = new Map();

    for (const item of cartItems) {
        const vendorId = item.variant.productId.createdBy.toString();
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
export const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { shippingAddress, paymentMethod } = req.body;

        if (!shippingAddress || !paymentMethod)
            throw new APIError(400, "Shipping address & payment method required");

        const cart = await Cart.findOne({ userId })
            .populate({
                path: "items.variant",
                populate: { path: "productId", model: "Product" }
            })
            .session(session);

        if (!cart || cart.items.length === 0)
            throw new APIError(400, "Cart is empty");

        // Stock validation
        for (const item of cart.items) {
            if (item.quantity > item.variant.stock)
                throw new APIError(
                    400,
                    `Out of stock: ${item.variant.productId.name}`
                );
        }

        const { splitdata, grandTotal } = await calculateVendorSplit(cart.items);

        const allItemsSnapshot = cart.items.map((item) => ({
            product: item.variant.productId._id,
            variant: item.variant._id,
            price: item.unitPrice,
            quantity: item.quantity
        }));

        let transactionId = null;
        let razorpayOrder = null;

        /* ================= ONLINE ================= */
        if (paymentMethod === "ONLINE") {
            // Razorpay call outside transaction
            await session.abortTransaction();
            session.endSession();

            const options = {
                amount: grandTotal * 100,
                currency: "INR",
                receipt: `receipt_${Date.now()}`
            };

            razorpayOrder = await razorpayInstance.orders.create(options);

            const newSession = await mongoose.startSession();
            newSession.startTransaction();
            console.log("spa" + splitdata.reduce((acc, data) => acc + data.billSummary.itemsTotal, 0));
            const masterOrder = await Order.create(
                [
                    {
                        userId,
                        items: allItemsSnapshot,
                        totalAmount: grandTotal,
                        netAmount: splitdata.reduce((acc, data) => acc + data.billSummary.itemsTotal, 0),
                        shippingAddress,
                        status: "PENDING",
                        paymentStatus: "UNPAID",
                        paymentMethod: "ONLINE",
                        orderType: "MASTER",
                        transactionRef: razorpayOrder.id
                    }
                ],
                { session: newSession }
            );

            const subOrderDocs = splitdata.map((data) => ({
                userId,
                items: data.items.map((item) => ({
                    product: item.variant.productId._id,
                    variant: item.variant._id,
                    price: item.unitPrice,
                    quantity: item.quantity
                })),
                vandorId: data.vendorId,
                totalAmount: data.billSummary.grandTotal,
                shippingAddress,
                status: "PENDING",
                paymentStatus: "UNPAID",
                paymentMethod: "ONLINE",
                orderType: "SUB",
                parentId: masterOrder[0]._id,
                transactionRef: razorpayOrder.id
            }));

            await Order.insertMany(subOrderDocs, { session: newSession });

            await newSession.commitTransaction();
            newSession.endSession();

            return res.status(200).json({
                success: true,
                razorpayOrder,
                masterOrderId: masterOrder[0]._id
            });
        }

        /* ================= COD / WALLET ================= */

        let paymentStatus = "UNPAID";
        let orderStatus = "CONFIRMED";

        if (paymentMethod === "WALLET") {
            const wallet = await Wallet.findOne({ userId }).session(session);
            if (!wallet || wallet.balance < grandTotal)
                throw new APIError(400, "Insufficient wallet balance");

            wallet.balance -= grandTotal;
            await wallet.save({ session });

            paymentStatus = "PAID";
        }

        const masterOrder = await Order.create(
            [
                {
                    userId,
                    items: allItemsSnapshot,
                    totalAmount: grandTotal,
                    netAmount: grandTotal,
                    shippingAddress,
                    status: orderStatus,
                    paymentStatus,
                    paymentMethod,
                    orderType: "MASTER"
                }
            ],
            { session }
        );

        const transaction = await Transaction.create(
            [
                {
                    userId,
                    orderId: masterOrder[0]._id,
                    amount: grandTotal,
                    paymentMethod,
                    status: paymentMethod === "COD" ? "PENDING" : "SUCCESS",
                    payType: paymentMethod === "WALLET" ? "DEBIT" : undefined,
                    walletPurpose: paymentMethod === "WALLET" ? "ORDER_PAYMENT" : null,
                }
            ],
            { session }
        );

        transactionId = transaction[0]._id;

        await Order.updateOne(
            { _id: masterOrder[0]._id },
            {
                $set: {
                    transactionId,
                    "items.$[].status": "CONFIRMED"
                }
            },
            { session }
        );

        const subOrderDocs = splitdata.map((data) => ({
            userId,
            items: data.items.map((item) => ({
                product: item.variant.productId._id,
                variant: item.variant._id,
                price: item.unitPrice,
                quantity: item.quantity,
                status: "CONFIRMED"
            })),
            vandorId: data.vendorId,
            totalAmount: data.billSummary.grandTotal,
            shippingAddress,
            status: orderStatus,
            paymentStatus,
            paymentMethod,
            orderType: "SUB",
            parentId: masterOrder[0]._id,
            transactionId
        }));

        await Order.insertMany(subOrderDocs, { session });

        // BULK STOCK UPDATE
        const variantOps = [];
        const productOps = [];

        for (const data of splitdata) {
            for (const item of data.items) {
                variantOps.push({
                    updateOne: {
                        filter: { _id: item.variant._id },
                        update: { $inc: { stock: -item.quantity, sold: item.quantity } }
                    }
                });

                productOps.push({
                    updateOne: {
                        filter: { _id: item.variant.productId._id },
                        update: { $inc: { sold: item.quantity } }
                    }
                });
            }
        }

        await Variant.bulkWrite(variantOps, { session });
        await Product.bulkWrite(productOps, { session });

        // cart.items = [];
        // cart.totalAmount = 0;
        // await cart.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Invalidate this user's order cache so next GET fetches fresh data
        await redis.del(...(await redis.keys(`orders:user:${userId}:*`)).concat(["_placeholder_"])).catch(() => { });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            masterOrder: masterOrder[0]
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};



// export const verifyPayment = async (req, res, next) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         const {
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature
//         } = req.body;
//         const userId = req.user.id;

//         const generated_signature = crypto
//             .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//             .update(razorpay_order_id + "|" + razorpay_payment_id)
//             .digest("hex");

//         if (generated_signature !== razorpay_signature) {
//             return next(new APIError(400, "Payment verification failed"));
//         }

//         const masterOrder = await Order.findOne({ transactionRef: razorpay_order_id, orderType: "MASTER" }).session(session);

//         if (!masterOrder) {
//             return next(new APIError(404, "Master order not found for this payment"));
//         }

//         const subOrders = await Order.find({ parentId: masterOrder._id }).session(session);

//         const transaction = new Transaction({
//             userId,
//             orderId: masterOrder._id,
//             amount: masterOrder.totalAmount,
//             paymentMethod: "ONLINE",
//             status: "SUCCESS",
//             razorpayOrderId: razorpay_order_id,
//             razorpayPaymentId: razorpay_payment_id,
//             razorpaySignature: razorpay_signature,
//         });
//         await transaction.save({ session });

//         masterOrder.status = "CONFIRMED";
//         masterOrder.paymentStatus = "PAID";
//         masterOrder.transactionId = transaction._id;
//         await masterOrder.save({ session });
//         for (const order of subOrders) {
//             order.status = "CONFIRMED";
//             order.paymentStatus = "PAID";
//             order.transactionId = transaction._id;
//             await order.save({ session });

//             for (const item of order.items) {
//                 await Variant.findByIdAndUpdate(item.variant, {
//                     $inc: { stock: -item.quantity, sold: item.quantity }
//                 }, { session });
//                 await Product.findByIdAndUpdate(item.product, {
//                     $inc: { sold: item.quantity }
//                 }, { session });
//             }
//         }

//         await Cart.findOneAndUpdate({ userId }, { items: [], totalAmount: 0 }, { session });

//         await session.commitTransaction();
//         session.endSession();

//         res.status(200).json({
//             success: true,
//             message: "Payment verified and orders placed",
//             masterOrder,
//             subOrders
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         next(error);
//     }
// };


export const verifyPayment = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body;
        const userId = req.user.id;

        const generated = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated !== razorpay_signature)
            throw new APIError(400, "Payment verification failed");

        const masterOrder = await Order.findOne({
            transactionRef: razorpay_order_id,
            orderType: "MASTER"
        }).session(session);

        if (!masterOrder)
            throw new APIError(404, "Master order not found");

        const subOrders = await Order.find({
            parentId: masterOrder._id
        }).session(session);

        const transaction = await Transaction.create(
            [
                {
                    userId,
                    orderId: masterOrder._id,
                    amount: masterOrder.totalAmount,
                    paymentMethod: "ONLINE",
                    status: "SUCCESS",
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
                }
            ],
            { session }
        );

        await Order.updateMany(
            { _id: { $in: [masterOrder._id, ...subOrders.map((o) => o._id)] } },
            {
                $set: {
                    status: "CONFIRMED",
                    paymentStatus: "PAID",
                    transactionId: transaction[0]._id,
                    "items.$[].status": "CONFIRMED",
                }
            },
            { session }
        );

        const variantOps = [];
        const productOps = [];

        for (const order of subOrders) {
            for (const item of order.items) {
                variantOps.push({
                    updateOne: {
                        filter: { _id: item.variant },
                        update: { $inc: { stock: -item.quantity, sold: item.quantity } }
                    }
                });

                productOps.push({
                    updateOne: {
                        filter: { _id: item.product },
                        update: { $inc: { sold: item.quantity } }
                    }
                });
            }
        }

        await Variant.bulkWrite(variantOps, { session });
        await Product.bulkWrite(productOps, { session });

        await Cart.findOneAndUpdate(
            { userId },
            { items: [], totalAmount: 0 },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        // Invalidate the buyer's order cache after payment verification
        const buyerKeys = await redis.keys(`orders:user:${userId}:*`);
        if (buyerKeys.length) await redis.del(buyerKeys);

        res.json({
            success: true,
            message: "Payment verified & order placed"
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// by user
export const getAllOrders = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `orders:user:${userId}:${JSON.stringify(req.query)}`;

        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }
        const filter = { userId, orderType: "MASTER" };
        if (req.query.status) filter.status = req.query.status;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "items.product", select: "name thumbnail " })
                // .populate({ path: "items.variant", select: "color size price stock" })
                // .populate({ path: "transactionId", select: "amount status paymentMethod createdAt" })
                .lean(),
            Order.countDocuments(filter)
        ]);


        const response = {
            success: true,
            message: "Orders fetched successfully",
            data: {
                orders,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };

        await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

/* ========================== GET ALL ORDERS BY VENDOR ========================== */
export const getOrdersByVendor = async (req, res, next) => {
    try {
        const vandorId = req.params.vendorId;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Cache key covers all query params
        const cacheKey = `orders:vendor:${vandorId}:${JSON.stringify(req.query)}`;
        const cached = await redis.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        const filter = { vandorId, orderType: "SUB" };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

        const now = new Date();

        const dateRangeMap = {
            today: () => {
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                return { $gte: start };
            },
            last7days: () => {
                const start = new Date(now);
                start.setDate(start.getDate() - 7);
                return { $gte: start };
            },
            last30days: () => {
                const start = new Date(now);
                start.setDate(start.getDate() - 30);
                return { $gte: start };
            },
            last90days: () => {
                const start = new Date(now);
                start.setDate(start.getDate() - 90);
                return { $gte: start };
            },
            custom: () => {
                const range = {};
                if (req.query.startDate) range.$gte = new Date(req.query.startDate);
                if (req.query.endDate) {
                    const end = new Date(req.query.endDate);
                    end.setHours(23, 59, 59, 999);
                    range.$lte = end;
                }
                return Object.keys(range).length ? range : null;
            }
        };

        const { dateRange } = req.query;
        if (dateRange && dateRangeMap[dateRange]) {
            const range = dateRangeMap[dateRange]();
            if (range) filter.createdAt = range;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "items.product", select: "name thumbnail" })
                .populate({ path: "items.variant", select: "size price stock" })
                .lean(),
            Order.countDocuments(filter)
        ]);

        const response = {
            success: true,
            message: "Vendor orders fetched successfully",
            data: {
                orders,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };

        await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

// Statuses from which a user is NOT allowed to cancel
const NON_CANCELLABLE_STATUSES = ["DELIVERED", "CANCELLED", "RETURNED", "OUT_FOR_DELIVERY"];

export const cancelOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        const masterOrder = await Order.findOne({
            _id: orderId,
            userId,
            orderType: "MASTER"
        }).session(session);

        if (!masterOrder) throw new APIError(404, "Order not found");

        if (NON_CANCELLABLE_STATUSES.includes(masterOrder.status)) {
            throw new APIError(
                400,
                `Order cannot be cancelled — current status is "${masterOrder.status}"`
            );
        }

        const subOrders = await Order.find({
            parentId: masterOrder._id,
            orderType: "SUB"
        }).session(session);

        const variantOps = [];
        const productOps = [];

        for (const sub of subOrders) {
            for (const item of sub.items) {
                variantOps.push({
                    updateOne: {
                        filter: { _id: item.variant },
                        update: { $inc: { stock: item.quantity, sold: -item.quantity } }
                    }
                });
                productOps.push({
                    updateOne: {
                        filter: { _id: item.product },
                        update: { $inc: { sold: -item.quantity } }
                    }
                });
            }
        }

        if (variantOps.length) await Variant.bulkWrite(variantOps, { session });
        if (productOps.length) await Product.bulkWrite(productOps, { session });

        await Order.updateOne(
            { _id: masterOrder._id },
            {
                $set: {
                    status: "CANCELLED",
                    reason: reason || "Cancelled by customer",
                    cancleBy: "COSTOMER",
                    "items.$[].status": "CANCELLED"
                }
            },
            { session }
        );

        const subIds = subOrders.map((o) => o._id);
        if (subIds.length) {
            await Order.updateMany(
                { _id: { $in: subIds } },
                {
                    $set: {
                        status: "CANCELLED",
                        reason: reason || "Cancelled by customer",
                        cancleBy: "COSTOMER",
                        "items.$[].status": "CANCELLED"
                    }
                },
                { session }
            );
        }

        if (
            masterOrder.paymentStatus === "PAID" &&
            ["WALLET", "ONLINE"].includes(masterOrder.paymentMethod)
        ) {
            await Wallet.findOneAndUpdate(
                { userId },
                { $inc: { balance: masterOrder.totalAmount } },
                { session, upsert: true }
            );

            await Transaction.create(
                [{
                    userId,
                    orderId: masterOrder._id,
                    amount: masterOrder.totalAmount,
                    paymentMethod: masterOrder.paymentMethod,
                    status: "SUCCESS",
                    payType: "CREDIT",
                    walletPurpose: "ORDER_REFUND"
                }],
                { session }
            );

            await Order.updateMany(
                { _id: { $in: [masterOrder._id, ...subIds] } },
                { $set: { paymentStatus: "REFUNDED" } },
                { session }
            );
        }

        await session.commitTransaction();
        session.endSession();

        const userKeys = await redis.keys(`orders:user:${userId}:*`);
        if (userKeys.length) await redis.del(userKeys);

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully"
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
        const vandorId = "6996b112fc8b2eec3d5e47e7";
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
            orderType: "SUB"
        }).session(session);

        if (!subOrder) throw new APIError(404, "Sub order not found");

        // Step 2: check this order belongs to the requesting vendor
        if (subOrder.vandorId.toString() !== vandorId.toString()) {
            throw new APIError(403, "You do not have permission to update this order");
        }

        // Step 3: validate the current status is actionable
        if (!["CONFIRMED", "PENDING"].includes(subOrder.status)) {
            throw new APIError(
                400,
                `Order cannot be updated — current status is "${subOrder.status}"`
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
                    "items.$[].status": newStatus
                }
            },
            { session }
        );

        if (action === "REJECT") {
            const variantOps = subOrder.items.map(item => ({
                updateOne: {
                    filter: { _id: item.variant },
                    update: { $inc: { stock: item.quantity, sold: -item.quantity } }
                }
            }));

            const productOps = subOrder.items.map(item => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { sold: -item.quantity } }
                }
            }));

            if (variantOps.length) await Variant.bulkWrite(variantOps, { session });
            if (productOps.length) await Product.bulkWrite(productOps, { session });
        }

        const remainingDifferentStatus = await Order.countDocuments({
            parentId: subOrder.parentId,
            orderType: "SUB",
            status: { $ne: newStatus }
        }).session(session);

        const masterStatus =
            remainingDifferentStatus === 0 ? newStatus : "MULTI_STATE";

        await Order.updateOne(
            { _id: subOrder.parentId },
            {
                $set: {
                    status: masterStatus,
                    "items.$[item].status": newStatus
                }
            },
            {
                session,
                arrayFilters: [
                    { "item.variant": { $in: subOrder.items.map(i => i.variant) } }
                ]
            }
        );

        await session.commitTransaction();
        session.endSession();

        await redis.incr(`vendor:orders:version:${vandorId}`);

        return res.status(200).json({
            success: true,
            message:
                action === "ACCEPT"
                    ? "Order accepted successfully"
                    : "Order rejected successfully",
            subOrderStatus: newStatus,
            masterOrderStatus: masterStatus
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/* ========================== GET ORDER BY ID (USER) ========================== */
export const getOrderById = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params;

        const version =
            (await redis.get(`order:version:${orderId}`)) || 1;

        const cacheKey = `order:${orderId}:user:${userId}:v${version}`;

        const cached = await redis.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        const masterOrder = await Order.findOne({
            _id: orderId,
            userId,
        })
            .populate({
                path: "items.product",
                select: "name thumbnail"
            })
            .populate({
                path: "items.variant",
                select: "size price mrp discount"
            })
            .lean();

        if (!masterOrder) throw new APIError(404, "Order not found");

        const transactionPromise = Transaction.findById(
            masterOrder.transactionId
        )
            .select("amount status paymentMethod razorpayOrderId createdAt")
            .lean();

        const [transaction] = await Promise.all([
            transactionPromise
        ]);

        masterOrder.transactionId = transaction;

        const response = {
            success: true,
            message: "Order fetched successfully",
            data: {
                order: { ...masterOrder }
            }
        };

        await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
        return res.status(200).json(response);

    } catch (error) {
        next(error);
    }
};


export const adminGetAllOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const cacheKey = `admin:orders:${JSON.stringify(req.query)}`;
        const cached = await redis.get(cacheKey);
        if (cached) return res.status(200).json(JSON.parse(cached));

        const filter = {};
        if (req.query.orderType) filter.orderType = req.query.orderType;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
        if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

        if (req.query.search) {
            filter._id = { $regex: `^${req.query.search}`, $options: "i" };
        }

        const now = new Date();
        const dateRangeMap = {
            today: () => {
                const s = new Date(now); s.setHours(0, 0, 0, 0);
                return { $gte: s };
            },
            last7days: () => {
                const s = new Date(now); s.setDate(s.getDate() - 7);
                return { $gte: s };
            },
            last30days: () => {
                const s = new Date(now); s.setDate(s.getDate() - 30);
                return { $gte: s };
            },
            last90days: () => {
                const s = new Date(now); s.setDate(s.getDate() - 90);
                return { $gte: s };
            },
            custom: () => {
                const range = {};
                if (req.query.startDate) range.$gte = new Date(req.query.startDate);
                if (req.query.endDate) {
                    const end = new Date(req.query.endDate);
                    end.setHours(23, 59, 59, 999);
                    range.$lte = end;
                }
                return Object.keys(range).length ? range : null;
            }
        };

        const { dateRange } = req.query;
        if (dateRange && dateRangeMap[dateRange]) {
            const range = dateRangeMap[dateRange]();
            if (range) filter.createdAt = range;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "userId", select: "name email phone" })
                .populate({ path: "items.product", select: "name thumbnail" })
                // .populate({ path: "vandorId", select: "name email" })
                .lean(),
            Order.countDocuments(filter)
        ]);

        const response = {
            success: true,
            message: "Orders fetched successfully",
            data: {
                orders,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };

        // Cache for 2 minutes (shorter than user cache since admin data changes more)
        await redis.set(cacheKey, JSON.stringify(response), "EX", 120);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};





