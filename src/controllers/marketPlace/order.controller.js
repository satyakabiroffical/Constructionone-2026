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


// Helper to split cart items by vendor
const calculateVendorSplit = async (cartItems) => {
    const vendorMap = new Map();

    for (const item of cartItems) {
        // Find Vendor ID from Variant -> Product -> createdBy (Vendor)
        // Assuming Product.createdBy is the vendor. 
        // If Variant has createdBy, we can use that too, but usually product owner is vendor.

        // We need to fetch product if not populated, but plan said deep populate.
        const product = item.variant.productId; // populated
        const vendorId = product.createdBy.toString();

        if (!vendorMap.has(vendorId)) {
            vendorMap.set(vendorId, []);
        }
        vendorMap.get(vendorId).push(item);
    }

    const splitdata = [];
    let grandTotal = 0;

    for (const [vendorId, items] of vendorMap) {
        const billSummary = await calculateBillSummary(items);
        splitdata.push({
            vendorId,
            items,
            billSummary
        });
        grandTotal += billSummary.grandTotal;
    }

    return { splitdata, grandTotal };
};


export const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user._id;
        const { shippingAddress, paymentMethod } = req.body;

        if (!shippingAddress || !paymentMethod) {
            return next(new APIError(400, "Shipping address and payment method required"));
        }

        // 1. Get Cart
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.variant",
            populate: {
                path: "productId",
                model: "Product"
            }
        }).session(session);

        if (!cart || cart.items.length === 0) {
            return next(new APIError(400, "Cart is empty"));
        }

        // Validate stock before processing
        for (const item of cart.items) {
            if (item.quantity > item.variant.stock) {
                return next(new APIError(400, `Out of stock: ${item.variant.productId.name}`));
            }
        }

        // 2. Split by Vendor
        const { splitdata, grandTotal } = await calculateVendorSplit(cart.items);

        let masterOrder;
        const subOrders = [];
        let transactionId = null;

        // 3. Prepare Common Data
        // Master Order Items (All items snapshot)
        const allItemsSnapshot = cart.items.map(item => ({
            product: item.variant.productId._id,
            variant: item.variant._id,
            price: item.unitPrice,
            quantity: item.quantity,
        }));

        // 4. Payment Flow & Creation
        if (paymentMethod === "COD") {
            // Step 1: Create Master Order (without transactionId)
            masterOrder = new Order({
                userId,
                items: allItemsSnapshot,
                totalAmount: grandTotal,
                netAmount: splitdata.reduce((total, data) => total + data.billSummary.itemsTotal, 0),
                shippingAddress,
                status: "CONFIRMED",
                paymentStatus: "UNPAID",
                paymentMethod: "COD",
                orderType: "MASTER",
            });
            await masterOrder.save({ session });

            // Step 2: Create Transaction with orderId
            const transaction = new Transaction({
                userId,
                orderId: masterOrder._id,
                amount: grandTotal,
                paymentMethod: "COD",
                status: "PENDING",
                walletPurpose: "ORDER_PAYMENT"
            });
            await transaction.save({ session });
            transactionId = transaction._id;

            // Step 3: Update Master Order with transactionId
            masterOrder.transactionId = transactionId;
            await masterOrder.save({ session });

            // Create Sub Orders
            for (const data of splitdata) {
                const order = new Order({
                    userId,
                    items: data.items.map(item => ({
                        product: item.variant.productId._id,
                        variant: item.variant._id,
                        price: item.unitPrice,
                        quantity: item.quantity,
                    })),
                    vandorId: data.vendorId,
                    totalAmount: data.billSummary.grandTotal,
                    netAmount: data.billSummary.itemsTotal,
                    shippingAddress,
                    status: "CONFIRMED",
                    paymentStatus: "UNPAID",
                    paymentMethod: "COD",
                    orderType: "SUB",
                    parentId: masterOrder._id,
                    transactionId
                });
                await order.save({ session });
                subOrders.push(order);

                // Deduct Stock
                for (const item of data.items) {
                    await Variant.findByIdAndUpdate(item.variant._id, {
                        $inc: { stock: -item.quantity, sold: item.quantity }
                    }, { session });
                    await Product.findByIdAndUpdate(item.variant.productId._id, {
                        $inc: { sold: item.quantity }
                    }, { session });
                }
            }

        } else if (paymentMethod === "WALLET") {
            const wallet = await Wallet.findOne({ userId }).session(session);
            console.log(userId);
            console.log(wallet);
            if (!wallet || wallet.balance < grandTotal) {
                return next(new APIError(400, "Insufficient wallet balance"));
            }

            // Deduct Wallet
            wallet.balance -= grandTotal;
            await wallet.save({ session });

            // Create Master Order
            masterOrder = new Order({
                userId,
                items: allItemsSnapshot,
                totalAmount: grandTotal,
                netAmount: splitdata.reduce((total, data) => total + data.billSummary.itemsTotal, 0),
                shippingAddress,
                status: "CONFIRMED",
                paymentStatus: "PAID",
                paymentMethod: "WALLET",
                orderType: "MASTER",
            });
            await masterOrder.save({ session });

            // Create Transaction
            const transaction = new Transaction({
                userId,
                orderId: masterOrder._id,
                amount: grandTotal,
                paymentMethod: "WALLET",
                status: "SUCCESS",
                payType: "DEBIT",
                walletPurpose: "ORDER_PAYMENT"
            });
            await transaction.save({ session });
            transactionId = transaction._id;

            masterOrder.transactionId = transactionId;
            await masterOrder.save({ session });

            // Create Sub Orders
            for (const data of splitdata) {
                const order = new Order({
                    userId,
                    items: data.items.map(item => ({
                        product: item.variant.productId._id,
                        variant: item.variant._id,
                        price: item.unitPrice,
                        quantity: item.quantity,
                    })),
                    vandorId: data.vendorId,
                    totalAmount: data.billSummary.grandTotal,
                    shippingAddress,
                    status: "CONFIRMED",
                    paymentStatus: "PAID",
                    paymentMethod: "WALLET",
                    transactionId,
                    orderType: "SUB",
                    parentId: masterOrder._id
                });
                await order.save({ session });
                subOrders.push(order);

                // Deduct Stock
                for (const item of data.items) {
                    await Variant.findByIdAndUpdate(item.variant._id, {
                        $inc: { stock: -item.quantity, sold: item.quantity }
                    }, { session });
                    await Product.findByIdAndUpdate(item.variant.productId._id, {
                        $inc: { sold: item.quantity }
                    }, { session });
                }
            }

        } else if (paymentMethod === "ONLINE") {
            // Create Razorpay Order matching Grand Total
            const options = {
                amount: (grandTotal * 100), // paise
                currency: "INR",
                receipt: `receipt_${Date.now()}`
            };

            const razorpayOrder = await razorpayInstance.orders.create(options);

            // Create Master Order
            masterOrder = new Order({
                userId,
                items: allItemsSnapshot,
                totalAmount: grandTotal,
                netAmount: grandTotal,
                shippingAddress,
                status: "PENDING",
                paymentStatus: "UNPAID",
                paymentMethod: "ONLINE",
                orderType: "MASTER",
                transactionRef: razorpayOrder.id // Store RP Order ID on Master
            });
            await masterOrder.save({ session });

            // Create Sub Orders (Also UNPAID)
            for (const data of splitdata) {
                const order = new Order({
                    userId,
                    items: data.items.map(item => ({
                        product: item.variant.productId._id,
                        variant: item.variant._id,
                        price: item.unitPrice,
                        quantity: item.quantity,
                    })),
                    vandorId: data.vendorId,
                    totalAmount: data.billSummary.grandTotal,
                    shippingAddress,
                    status: "PENDING",
                    paymentStatus: "UNPAID",
                    paymentMethod: "ONLINE",
                    orderType: "SUB",
                    parentId: masterOrder._id,
                    transactionRef: razorpayOrder.id
                });
                await order.save({ session });
                subOrders.push(order);
            }

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                success: true,
                message: "Razorpay order created",
                razorpayOrder,
                masterOrderId: masterOrder._id,
                subOrderIds: subOrders.map(o => o._id)
            });
        } else {
            return next(new APIError(400, "Invalid payment method"));
        }

        // Clear Cart for COD/WALLET
        // if (paymentMethod !== "ONLINE") {
        //     cart.items = [];
        //     cart.totalAmount = 0;
        //     await cart.save({ session });
        // }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            masterOrder,
            subOrders
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
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;
        const userId = req.user.id;

        // 1. Verify Signature
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return next(new APIError(400, "Payment verification failed"));
        }

        // 2. Find Master Order
        const masterOrder = await Order.findOne({ transactionRef: razorpay_order_id, orderType: "MASTER" }).session(session);

        if (!masterOrder) {
            return next(new APIError(404, "Master order not found for this payment"));
        }

        // 3. Find Sub Orders
        const subOrders = await Order.find({ parentId: masterOrder._id }).session(session);

        // 4. Create Transaction
        const transaction = new Transaction({
            userId,
            orderId: masterOrder._id,
            amount: masterOrder.totalAmount,
            paymentMethod: "ONLINE",
            status: "SUCCESS",
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
        });
        await transaction.save({ session });

        // 5. Update Master Order
        masterOrder.status = "CONFIRMED";
        masterOrder.paymentStatus = "PAID";
        masterOrder.transactionId = transaction._id;
        await masterOrder.save({ session });

        // 6. Update Sub Orders + Deduct Stock
        for (const order of subOrders) {
            order.status = "CONFIRMED";
            order.paymentStatus = "PAID";
            order.transactionId = transaction._id;
            await order.save({ session });

            // Deduct Stock
            for (const item of order.items) {
                await Variant.findByIdAndUpdate(item.variant, {
                    $inc: { stock: -item.quantity, sold: item.quantity }
                }, { session });
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { sold: item.quantity }
                }, { session });
            }
        }

        // 7. Clear Cart
        await Cart.findOneAndUpdate({ userId }, { items: [], totalAmount: 0 }, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Payment verified and orders placed",
            masterOrder,
            subOrders
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};
