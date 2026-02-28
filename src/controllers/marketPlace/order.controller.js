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
import { sendOrderNotificationToUser, sendOrderNotificationToVendor } from "../notification.controller.js";
import invoice from "../../middlewares/invoice.middleware.js";
import vendorTaxInvoice from "../../middlewares/invoice.vendor.js";
import creditNoteInvoice from "../../middlewares/creditNote.middleware.js";
import { VendorCompany } from "../../models/vendorShop/vendor.model.js";

/**
 * generateOrderInvoices — fire-and-forget helper
 * Generates:
 *   1. User order invoice (on masterOrder)
 *   2. Vendor tax invoice for each subOrder
 * Saves the PDF URL to order.invoice on each respective document.
 */
async function generateOrderInvoices(masterOrder, subOrders) {
    try {
        // 1. User order invoice
        const userPdfUrl = await invoice(masterOrder);
        await Order.updateOne({ _id: masterOrder._id }, { $set: { invoice: userPdfUrl } });

        // 2. Vendor tax invoices — fetch all VendorCompany docs in one query
        const vendorIds = [...new Set(subOrders.map((o) => o.vandorId?.toString()).filter(Boolean))];
        const vendorCompanyDocs = await VendorCompany.find({ vendorId: { $in: vendorIds } }).lean();
        const vcMap = new Map(vendorCompanyDocs.map((vc) => [vc.vendorId.toString(), vc]));

        await Promise.allSettled(
            subOrders.map(async (subOrder) => {
                const vc = vcMap.get(subOrder.vandorId?.toString()) || {};
                // Map VendorCompany fields to what buildVendorInvoiceHtml expects
                const vendorData = {
                    businessName: vc.companyName || "Vendor",
                    gstNumber: vc.gstNumber || "N/A",
                    address: [
                        vc.businessAddress?.address,
                        vc.businessAddress?.city,
                        vc.businessAddress?.state,
                        vc.businessAddress?.pincode,
                    ].filter(Boolean).join(", "),
                };

                const vendorPdfUrl = await vendorTaxInvoice(subOrder, vendorData);
                await Order.updateOne({ _id: subOrder._id }, { $set: { invoice: vendorPdfUrl } });
            })
        );
    } catch (err) {
        console.error("[Invoice] generateOrderInvoices error:", err.message);
    }
}

const calculateVendorSplit = async (cartItems) => {
    const vendorMap = new Map();

    for (const item of cartItems) {
        const vendorId = item.variant.productId.vendorId?.toString();
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
export const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const userId = req.user._id;
        const { shippingAddress, paymentMethod } = req.body;

        if (!shippingAddress || !paymentMethod) {
            throw new APIError(400, "Shipping address & payment method required");
        }

        session.startTransaction();

        const cart = await Cart.findOne({ userId })
            .populate({
                path: "items.variant",
                populate: { path: "productId", model: "Product" }
            })
            .session(session);

        if (!cart || cart.items.length === 0) {
            throw new APIError(400, "Cart is empty");
        }

        // STOCK VALIDATION
        for (const item of cart.items) {
            if (item.quantity > item.variant.stock) {
                throw new APIError(
                    400,
                    `Out of stock: ${item.variant.productId.name}`
                );
            }
        }

        const { splitdata, grandTotal } =
            await calculateVendorSplit(cart.items);

        const DeliveryDate = new Date();
        DeliveryDate.setDate(DeliveryDate.getDate() + 7);

        /* ================= PAYMENT LOGIC ================= */

        let paymentStatus = "UNPAID";
        let orderStatus = "PENDING";

        if (paymentMethod === "WALLET") {
            const wallet = await Wallet.findOne({ userId }).session(session);

            if (!wallet || wallet.balance < grandTotal) {
                throw new APIError(400, "Insufficient wallet balance");
            }

            wallet.balance -= grandTotal;
            await wallet.save({ session });

            paymentStatus = "PAID";
        }

        /* ================= CREATE MASTER ORDER ================= */

        const masterOrder = await Order.create(
            [{
                userId,
                items: cart.items.map(item => ({
                    product: item.variant.productId._id,
                    variant: item.variant._id,
                    price: item.unitPrice,
                    quantity: item.quantity,
                    status: orderStatus
                })),
                totalAmount: grandTotal,
                netAmount: grandTotal,
                shippingAddress,
                status: orderStatus,
                paymentStatus,
                paymentMethod,
                orderType: "MASTER",
                deliveredDate: DeliveryDate
            }],
            { session }
        );

        const masterOrderId = masterOrder[0]._id;

        let razorpayOrderDetails = null;
        if (paymentMethod === "ONLINE") {
            const options = {
                amount: Math.round(grandTotal * 100),
                currency: "INR",
                receipt: masterOrderId.toString()
            };
            razorpayOrderDetails = await razorpayInstance.orders.create(options);
            masterOrder[0].transactionRef = razorpayOrderDetails.id;
            await masterOrder[0].save({ session });
        }

        /* ================= TRANSACTION ================= */

        const transaction = await Transaction.create(
            [{
                userId,
                orderId: masterOrderId,
                amount: grandTotal,
                paymentMethod,
                status: ["COD", "ONLINE"].includes(paymentMethod) ? "PENDING" : "SUCCESS"
            }],
            { session }
        );

        /* ================= CREATE SUB ORDERS ================= */

        const subOrderDocs = splitdata.map(data => ({
            userId,
            items: data.items.map(item => ({
                product: item.variant.productId._id,
                variant: item.variant._id,
                price: item.unitPrice,
                quantity: item.quantity,
                status: orderStatus,
                returnInDays: item.variant.productId.returnDays ?? 7
            })),
            vendorId: data.vendorId,
            totalAmount: data.billSummary.grandTotal,
            shippingAddress,
            status: orderStatus,
            paymentStatus,
            paymentMethod,
            orderType: "SUB",
            parentId: masterOrderId,
            transactionId: transaction[0]._id,
            deliveredDate: DeliveryDate
        }));

        await Order.insertMany(subOrderDocs, { session });

        /* ================= BULK STOCK UPDATE ================= */

        if (paymentMethod !== "ONLINE") {
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

            await Promise.all([
                Variant.bulkWrite(variantOps, { session }),
                Product.bulkWrite(productOps, { session })
            ]);
        }

        // if (paymentMethod !== "ONLINE") {
        //     await Cart.findOneAndUpdate(
        //         { userId },
        //         { items: [], totalAmount: 0 },
        //         { session }
        //     );
        // }

        await session.commitTransaction();
        session.endSession();


        await redis.incr(`user:orders:version:${userId}`).catch(console.error);

        if (paymentMethod !== "ONLINE") {
            sendOrderNotificationToUser(masterOrder[0], "CONFIRMED")
                .catch(console.error);

            Order.find({ parentId: masterOrderId, orderType: "SUB" })
                .lean()
                .then(subOrders => {
                    subOrders.forEach(sub =>
                        sendOrderNotificationToVendor(sub).catch(console.error)
                    );
                    // Generate invoices
                    generateOrderInvoices(masterOrder[0], subOrders);
                })
                .catch(console.error);
        }

        const responsePayload = {
            success: true,
            message: paymentMethod === "ONLINE" ? "Razorpay order created" : "Order created successfully",
            masterOrder: masterOrder[0]
        };

        if (paymentMethod === "ONLINE") {
            responsePayload.razorpayOrder = razorpayOrderDetails;
        }

        return res.status(201).json(responsePayload);

    } catch (error) {
        try {
            await session.abortTransaction();
        } catch (abortError) { }
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
        await Promise.all([
            Variant.bulkWrite(variantOps, { session }),
            Product.bulkWrite(productOps, { session })
        ])

        await Cart.findOneAndUpdate(
            { userId },
            { items: [], totalAmount: 0 },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        // Version bump — buyer's order list cache auto-invalidated, no redis.keys() needed
        await redis.incr(`user:orders:version:${userId}`);

        // Send notification to user after online payment confirmation
        await sendOrderNotificationToUser(masterOrder, "CONFIRMED");

        // Generate invoices + notify vendors fire-and-forget
        subOrders.forEach(sub =>
            sendOrderNotificationToVendor(sub).catch(console.error)
        );
        generateOrderInvoices(masterOrder, subOrders).catch((err) =>
            console.error("[Invoice] Background generation failed:", err.message)
        );

        res.json({
            success: true,
            message: "Payment verified & order placed"
        });
    } catch (error) {
        try {
            await session.abortTransaction();
        } catch (abortError) { }
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

        // Version-based cache: incr version on any order change — no redis.keys() needed
        const version = (await redis.get(`user:orders:version:${userId}`)) || 1;
        const cacheKey = `orders:user:${userId}:v${version}:${JSON.stringify(req.query)}`;

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

        // Version-based cache: incr version on any status change — no redis.keys() needed
        const version = (await redis.get(`vendor:orders:version:${vandorId}`)) || 1;
        const cacheKey = `orders:vendor:${vandorId}:v${version}:${JSON.stringify(req.query)}`;
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

        // ── Base filter for stats (aggregate needs ObjectId, not string) ──
        const statsFilter = {
            vandorId: new mongoose.Types.ObjectId(vandorId),
            orderType: "SUB",
        };

        const [orders, total, revenueResult, pendingCount] = await Promise.all([
            // 1. Paginated orders list
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "items.product", select: "name thumbnail" })
                .populate({ path: "items.variant", select: "size price stock" })
                .lean(),

            // 2. Total orders matching filter (for pagination)
            Order.countDocuments(filter),

            // 3. Total revenue — only PAID + DELIVERED orders
            Order.aggregate([
                {
                    $match: {
                        ...statsFilter,
                        paymentStatus: "PAID",
                        status: "DELIVERED",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" },
                    },
                },
            ]),

            // 4. Count of PENDING orders
            Order.countDocuments({
                ...statsFilter,
                status: "PENDING",
            }),
        ]);
        console.log("revenueResult", revenueResult[0]);

        const totalRevenue = revenueResult[0]?.totalRevenue ?? 0;

        const response = {
            success: true,
            message: "Vendor orders fetched successfully",
            stats: {
                totalRevenue,       // sum of totalAmount where PAID + DELIVERED
                pendingCount,       // count of PENDING orders
            },
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

    try {
        const userId = req.user._id;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        session.startTransaction();

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

        // Parallel stock restore
        await Promise.all([
            variantOps.length && Variant.bulkWrite(variantOps, { session }),
            productOps.length && Product.bulkWrite(productOps, { session })
        ]);

        const subIds = subOrders.map(o => o._id);

        // Single update for all orders
        await Order.updateMany(
            { _id: { $in: [masterOrder._id, ...subIds] } },
            {
                $set: {
                    status: "CANCELLED",
                    reason: reason || "Cancelled by customer",
                    cancleBy: "CUSTOMER",
                    "items.$[].status": "CANCELLED"
                }
            },
            { session }
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
                    { session, upsert: true }
                ),

                Transaction.create(
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
                ),

                Order.updateMany(
                    { _id: { $in: [masterOrder._id, ...subIds] } },
                    { $set: { paymentStatus: "REFUNDED" } },
                    { session }
                )
            ]);
        }

        await session.commitTransaction();
        session.endSession();


        redis.del(`orders:user:${userId}`).catch(() => { });

        setImmediate(() => {
            creditNoteInvoice(masterOrder)
                .then(pdfUrl =>
                    Order.updateOne(
                        { _id: masterOrder._id },
                        { $set: { creditNote: pdfUrl } }
                    )
                )
                .catch(err =>
                    console.error("[CreditNote] Generation failed:", err.message)
                );
        });

        return res.status(200).json({
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
        const vandorId = req.user._id;
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

        // Version bump — old cache keys become unreachable, expire naturally with TTL
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

        await redis.set(cacheKey, JSON.stringify(response), "EX", 120);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};



const ITEM_VALID_STATUSES = [
    "PENDING", "CONFIRMED", "VENDOR_CONFIRMED", "VENDOR_CANCELLED",
    "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED",
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

        const subOrder = await Order.findOne(subOrderQuery)
            .session(session)
            .lean();

        if (!subOrder)
            throw new APIError(
                404,
                "Sub-order not found or you do not have access to it"
            );

        const targetItem = subOrder.items.find((it) =>
            it.variant?.toString() === variantObjectId.toString()
        );

        if (!targetItem)
            throw new APIError(
                404,
                `Variant "${variantId}" does not exist in this sub-order`
            );

        await Order.updateOne(
            { _id: subOrderId },
            { $set: { "items.$[elem].status": status } },
            {
                session,
                arrayFilters: [{ "elem.variant": variantObjectId }],
            }
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
            uniqueItemStatuses.length === 1
                ? uniqueItemStatuses[0]
                : "MULTI_STATE";

        const masterOrderId = subOrder.parentId;

        const hasDifferentStatus = await Order.exists({
            parentId: masterOrderId,
            orderType: "SUB",
            _id: { $ne: subOrderId },
            status: { $ne: newSubStatus },
        }).session(session);

        const newMasterStatus = hasDifferentStatus
            ? "MULTI_STATE"
            : newSubStatus;

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
            { session }
        );

        if (STOCK_RESTORE_STATUSES.has(status)) {
            const qty = targetItem.quantity;

            await Promise.all([
                Variant.updateOne(
                    { _id: variantObjectId },
                    { $inc: { stock: qty, sold: -qty } },
                    { session }
                ),
                Product.updateOne(
                    { _id: targetItem.product },
                    { $inc: { sold: -qty } },
                    { session }
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

        const subOrder = await Order.findOne(subOrderQuery, { parentId: 1, items: 1, userId: 1, vandorId: 1 }).session(session);
        if (!subOrder)
            throw new APIError(404, "Sub-order not found or you do not have access to it");

        const masterOrderId = subOrder.parentId;
        const variantIds = subOrder.items.map((it) => it.variant).filter(Boolean);

        await Order.updateOne(
            { _id: subOrderId },
            { $set: { status, "items.$[].status": status } },
            { session }
        );

        if (variantIds.length > 0) {
            await Order.updateOne(
                { _id: masterOrderId },
                { $set: { "items.$[elem].status": status } },
                { session, arrayFilters: [{ "elem.variant": { $in: variantIds } }] }
            );
        }

        // ── Recalculate master order status ──────────────────────────────────
        const allSubOrders = await Order.find(
            { parentId: masterOrderId, orderType: "SUB" },
            { status: 1 }
        ).session(session);

        const uniqueStatuses = [
            ...new Set(allSubOrders.map((s) => (s._id.equals(subOrderId) ? status : s.status))),
        ];
        const newMasterStatus = uniqueStatuses.length === 1 ? uniqueStatuses[0] : "MULTI_STATE";
        const masterUpdate = { status: newMasterStatus };
        if (newMasterStatus === "DELIVERED") masterUpdate.deliveredDate = new Date();

        await Order.updateOne({ _id: masterOrderId }, { $set: masterUpdate }, { session });

        // ── Stock restoration (CANCELLED / RETURNED) ─────────────────────────
        if (STOCK_RESTORE_STATUSES.has(status) && subOrder.items.length > 0) {
            const variantOps = subOrder.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.variant },
                    update: { $inc: { stock: item.quantity, sold: -item.quantity } }
                }
            }));
            const productOps = subOrder.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { sold: -item.quantity } }
                }
            }));
            await Promise.all([
                Variant.bulkWrite(variantOps, { session }),
                Product.bulkWrite(productOps, { session })
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
            data: { subOrderId, subOrderStatus: status, masterOrderId, masterStatus: newMasterStatus },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

