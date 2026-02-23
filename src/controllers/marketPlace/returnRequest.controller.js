import mongoose from "mongoose";
import { APIError } from "../../middlewares/errorHandler.js";
import redis from "../../config/redis.config.js";
import Order from "../../models/marketPlace/order.model.js";
import ReturnRequest from "../../models/marketPlace/returnRequest.model.js";
import Refund from "../../models/marketPlace/refund.model.js";
import Wallet from "../../models/user/wallet.model.js";
import Transaction from "../../models/user/transaction.model.js";

const VALID_RETURN_REASONS = [
    "DEFECTIVE_PRODUCT",
    "WRONG_ITEM_DELIVERED",
    "ITEM_NOT_AS_DESCRIBED",
    "DAMAGED_IN_SHIPPING",
    "MISSING_PARTS_OR_ACCESSORIES",
    "CHANGED_MIND",
    "OTHER",
];


export const submitReturnRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { orderId } = req.params;
        const { reason, description, items } = req.body;

        if (!reason) throw new APIError(400, "Return reason is required");
        // if (!VALID_RETURN_REASONS.includes(reason)) {
        //     throw new APIError(
        //         400,
        //         `Invalid reason. Allowed: ${VALID_RETURN_REASONS.join(", ")}`
        //     );
        // }

        // if (description && description.trim().length > 500) {
        //     throw new APIError(400, "Description must not exceed 500 characters");
        // }

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new APIError(400, "At least one item must be specified for return");
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.variant)
                throw new APIError(400, `items[${i}]: variant id is required`);
            if (!item.quantity || item.quantity < 1 || !Number.isInteger(Number(item.quantity)))
                throw new APIError(400, `items[${i}]: quantity must be a positive integer`);
            if (!item.reason || !String(item.reason).trim())
                throw new APIError(400, `items[${i}]: individual item reason is required`);
        }

        // ── 3. Fetch MASTER order ─────────────────────────────────────────────
        const masterOrder = await Order.findOne({
            _id: orderId,
            userId,
            orderType: "MASTER",
        }).session(session);

        if (!masterOrder) throw new APIError(404, "Order not found");

        const returnableStatuses = ["DELIVERED", "MULTI_STATE"];
        if (!returnableStatuses.includes(masterOrder.status)) {
            throw new APIError(
                400,
                `Return requests can only be raised for delivered orders. Current status: "${masterOrder.status}"`
            );
        }

        if (!masterOrder.deliveredDate) {
            throw new APIError(
                400,
                "Delivery date is not recorded for this order. Please contact support."
            );
        }

        const requestedVariantIds = items.map((i) => new mongoose.Types.ObjectId(i.variant.toString()));

        const conflictingReturn = await ReturnRequest.findOne({
            orderId,
            userId,
            status: { $in: ["PENDING", "APPROVED", "PICKUP_SCHEDULED", "REFUND_INITIATED"] },
            "items.variant": { $in: requestedVariantIds },
        }).session(session);

        if (conflictingReturn) {
            throw new APIError(
                409,
                "One or more selected items already have an active return request in progress"
            );
        }

        const subOrders = await Order.find({
            parentId: orderId,
            orderType: "SUB",
        }).session(session);

        if (!subOrders.length) {
            throw new APIError(500, "Sub-orders not found for this order");
        }

        const variantMetaMap = new Map();
        for (const sub of subOrders) {
            for (const oi of sub.items) {
                if (!oi.variant) continue;
                variantMetaMap.set(oi.variant.toString(), {
                    vandorId: sub.vandorId,
                    subOrderId: sub._id,
                    returnInDays: oi.returnInDays,
                    price: oi.price,
                    orderedQty: oi.quantity,
                    product: oi.product,
                });
            }
        }

        // ── 6. Per-item: return window & quantity validation ──────────────────
        const now = new Date();
        const deliveredAt = new Date(masterOrder.deliveredDate);

        for (let i = 0; i < items.length; i++) {
            const reqItem = items[i];
            const meta = variantMetaMap.get(reqItem.variant.toString());

            if (!meta) {
                throw new APIError(
                    400,
                    `items[${i}]: variant "${reqItem.variant}" was not part of this order`
                );
            }

            const returnWindowDays = meta.returnInDays;
            if (!returnWindowDays || returnWindowDays <= 0) {
                throw new APIError(
                    400,
                    `items[${i}]: this variant is not eligible for returns`
                );
            }

            const deadlineMs = deliveredAt.getTime() + returnWindowDays * 86400000;
            if (now.getTime() > deadlineMs) {
                const deadline = new Date(deadlineMs).toLocaleDateString("en-IN");
                throw new APIError(
                    400,
                    `items[${i}]: return window of ${returnWindowDays} day(s) has expired (deadline: ${deadline})`
                );
            }

            if (Number(reqItem.quantity) > meta.orderedQty) {
                throw new APIError(
                    400,
                    `items[${i}]: return quantity (${reqItem.quantity}) cannot exceed ordered quantity (${meta.orderedQty})`
                );
            }
        }

        // ── 7. Group items vendor-wise ────────────────────────────────────────
        const vendorMap = new Map();
        for (const reqItem of items) {
            const meta = variantMetaMap.get(reqItem.variant.toString());
            const key = meta.vandorId.toString();

            if (!vendorMap.has(key)) {
                vendorMap.set(key, {
                    vandorId: meta.vandorId,
                    subOrderId: meta.subOrderId,
                    items: [],
                    refundAmount: 0,
                });
            }

            const entry = vendorMap.get(key);
            entry.items.push({
                product: meta.product,          // resolved from order
                variant: reqItem.variant,        // from client
                quantity: Number(reqItem.quantity),
                price: meta.price,
                reason: String(reqItem.reason).trim(),
            });
            entry.refundAmount += meta.price * Number(reqItem.quantity);
        }

        const masterReturnId = new mongoose.Types.ObjectId();

        const returnDocs = [...vendorMap.values()].map((v) => ({
            masterReturnId,
            orderId,
            subOrderId: v.subOrderId,
            userId,
            vandorId: v.vandorId,
            reason,
            description: description?.trim() || "",
            items: v.items,
            refundAmount: v.refundAmount,
        }));

        const createdReturns = await ReturnRequest.insertMany(returnDocs, { session });

        const returnedVariantObjectIds = items.map(
            (i) => new mongoose.Types.ObjectId(i.variant.toString())
        );

        await Order.updateOne(
            { _id: orderId },
            { $set: { "items.$[elem].status": "RETURN_REQUESTED" } },
            {
                session,
                arrayFilters: [{ "elem.variant": { $in: returnedVariantObjectIds } }],
            }
        );

        const affectedSubOrderIds = [...vendorMap.values()].map((v) => v.subOrderId);

        await Order.updateMany(
            { _id: { $in: affectedSubOrderIds } },
            { $set: { "items.$[elem].status": "RETURN_REQUESTED" } },
            {
                session,
                arrayFilters: [{ "elem.variant": { $in: returnedVariantObjectIds } }],
            }
        );

        const affectedSubOrders = await Order.find(
            { _id: { $in: affectedSubOrderIds } },
            { items: 1, status: 1 }
        ).session(session);

        const subStatusUpdates = affectedSubOrders.map((sub) => {
            const itemStatuses = [...new Set(sub.items.map((it) => it.status))];
            const newSubStatus = itemStatuses.length === 1 ? itemStatuses[0] : "MULTI_STATE";
            return { id: sub._id, status: newSubStatus };
        });

        for (const upd of subStatusUpdates) {
            await Order.updateOne(
                { _id: upd.id },
                { $set: { status: upd.status } },
                { session }
            );
        }

        const allSubOrders = await Order.find(
            { parentId: orderId, orderType: "SUB" },
            { status: 1, _id: 0 }
        ).session(session);

        const subStatusMap = new Map(subStatusUpdates.map((u) => [u.id.toString(), u.status]));
        const finalSubStatuses = allSubOrders.map((s) =>
            subStatusMap.has(s._id?.toString()) ? subStatusMap.get(s._id.toString()) : s.status
        );

        const uniqueMasterStatuses = [...new Set(finalSubStatuses)];
        const newMasterStatus = uniqueMasterStatuses.length === 1
            ? uniqueMasterStatuses[0]
            : "MULTI_STATE";

        await Order.updateOne(
            { _id: orderId },
            { $set: { status: newMasterStatus } },
            { session }
        );


        await session.commitTransaction();
        session.endSession();

        const userKeys = await redis.keys(`orders:user:${userId}:*`);
        if (userKeys.length) await redis.del(userKeys);

        return res.status(201).json({
            success: true,
            message: `Return request submitted. ${createdReturns.length} vendor return(s) created.`,
            data: {
                masterReturnId,
                returnRequests: createdReturns.map((r) => ({
                    returnRequestId: r._id,
                    vandorId: r.vandorId,
                    status: r.status,
                    refundAmount: r.refundAmount,
                    itemCount: r.items.length,
                })),
            },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/* ══════════════════════════════════════════════════════════════════════════════
 * 2.  VENDOR REVIEW  (Vendor)
 *     PUT /return-request/:returnId/review
 *
 *     Body: { action: "APPROVE" | "REJECT", rejectionReason? }
 *
 *     • APPROVE → status: APPROVED + pickupScheduledAt (now + 2 days)
 *     • REJECT  → status: REJECTED + rejectionReason
 * ══════════════════════════════════════════════════════════════════════════════ */
export const vendorReviewReturn = async (req, res, next) => {
    try {
        const vandorId = req.user._id; // vendor authenticated
        const { returnId } = req.params;
        const { action, rejectionReason } = req.body;

        if (!["APPROVE", "REJECT"].includes(action)) {
            throw new APIError(400, "action must be APPROVE or REJECT");
        }

        const returnReq = await ReturnRequest.findOne({
            _id: returnId,
            vandorId,
        });

        if (!returnReq) throw new APIError(404, "Return request not found");

        if (returnReq.status !== "PENDING") {
            throw new APIError(
                400,
                `Cannot review — current status is "${returnReq.status}"`
            );
        }

        if (action === "REJECT") {
            if (!rejectionReason || !rejectionReason.trim()) {
                throw new APIError(400, "rejectionReason is required when rejecting");
            }
            returnReq.status = "REJECTED";
            returnReq.rejectionReason = rejectionReason.trim();
        } else {
            // APPROVE — schedule pickup 2 days from now
            returnReq.status = "APPROVED";
            const pickup = new Date();
            pickup.setDate(pickup.getDate() + 2);
            returnReq.pickupScheduledAt = pickup;
        }

        await returnReq.save();

        return res.status(200).json({
            success: true,
            message: action === "APPROVE" ? "Return approved. Pickup scheduled." : "Return rejected.",
            data: {
                returnRequestId: returnReq._id,
                status: returnReq.status,
                pickupScheduledAt: returnReq.pickupScheduledAt || null,
                rejectionReason: returnReq.rejectionReason || null,
            },
        });
    } catch (error) {
        next(error);
    }
};

/* ══════════════════════════════════════════════════════════════════════════════
 * 3.  QUALITY CHECK  (Vendor / Admin)
 *     PUT /return-request/:returnId/qc
 *
 *     Body: { result: "PASS" | "FAIL", qcNote? }
 *
 *     • PASS → QC_PASSED → create Refund → credit wallet → COMPLETED
 *     • FAIL → QC_FAILED (no refund)
 *     All in a MongoDB transaction for atomicity.
 * ══════════════════════════════════════════════════════════════════════════════ */
export const performQC = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { returnId } = req.params;
        const { result, qcNote } = req.body;

        if (!["PASS", "FAIL"].includes(result)) {
            throw new APIError(400, "result must be PASS or FAIL");
        }

        const returnReq = await ReturnRequest.findById(returnId).session(session);

        if (!returnReq) throw new APIError(404, "Return request not found");

        // QC can only be done after pickup, or after APPROVED (flexible for vendors)
        if (!["APPROVED", "PICKUP_SCHEDULED"].includes(returnReq.status)) {
            throw new APIError(
                400,
                `QC cannot be performed — current status is "${returnReq.status}"`
            );
        }

        if (result === "FAIL") {
            returnReq.status = "QC_FAILED";
            returnReq.qcNote = qcNote?.trim() || "Quality check failed";
            await returnReq.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                success: true,
                message: "QC failed. Return closed. No refund will be issued.",
                data: { status: returnReq.status },
            });
        }

        // ── QC PASS → trigger refund ──────────────────────────────────────────
        returnReq.status = "QC_PASSED";
        returnReq.qcNote = qcNote?.trim() || "";

        const refundAmount = returnReq.refundAmount;

        if (refundAmount <= 0) {
            throw new APIError(500, "Refund amount is 0 — cannot process refund");
        }

        // Create Refund record
        const [refundDoc] = await Refund.create(
            [
                {
                    returnRequestId: returnReq._id,
                    userId: returnReq.userId,
                    orderId: returnReq.orderId,
                    vandorId: returnReq.vandorId,
                    amount: refundAmount,
                    refundMethod: "WALLET",
                    status: "INITIATED",
                },
            ],
            { session }
        );

        returnReq.status = "REFUND_INITIATED";
        returnReq.refundId = refundDoc._id;
        await returnReq.save({ session });

        // Credit wallet
        await Wallet.findOneAndUpdate(
            { userId: returnReq.userId },
            { $inc: { balance: refundAmount } },
            { session, upsert: true, new: true }
        );

        // Create a wallet transaction record
        await Transaction.create(
            [
                {
                    userId: returnReq.userId,
                    orderId: returnReq.orderId,
                    amount: refundAmount,
                    paymentMethod: "WALLET",
                    status: "SUCCESS",
                    payType: "CREDIT",
                    walletPurpose: "RETURN_REFUND",
                },
            ],
            { session }
        );

        // Mark refund SUCCESS
        await Refund.updateOne(
            { _id: refundDoc._id },
            { $set: { status: "SUCCESS", processedAt: new Date() } },
            { session }
        );

        // Mark return COMPLETED
        returnReq.status = "COMPLETED";
        await returnReq.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Invalidate user order cache
        const userKeys = await redis.keys(`orders:user:${returnReq.userId}:*`);
        if (userKeys.length) await redis.del(userKeys);

        return res.status(200).json({
            success: true,
            message: `QC passed. Refund of ₹${refundAmount} credited to customer's wallet.`,
            data: {
                returnRequestId: returnReq._id,
                status: returnReq.status,
                refundId: refundDoc._id,
                refundAmount,
                refundMethod: "WALLET",
            },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/* ══════════════════════════════════════════════════════════════════════════════
 * 4.  GET USER'S RETURN REQUESTS  (User)
 *     GET /return-request/my?page=1&limit=10&status=PENDING
 * ══════════════════════════════════════════════════════════════════════════════ */
export const getUserReturnRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { userId };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.orderId) filter.orderId = req.query.orderId;

        const [returnRequests, total] = await Promise.all([
            ReturnRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "items.product", select: "name thumbnail" })
                .populate({ path: "items.variant", select: "size color" })
                .lean(),
            ReturnRequest.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Return requests fetched successfully",
            data: {
                returnRequests,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/* ══════════════════════════════════════════════════════════════════════════════
 * 5.  GET VENDOR'S RETURN REQUESTS  (Vendor)
 *     GET /return-request/vendor?page=1&limit=10&status=PENDING
 * ══════════════════════════════════════════════════════════════════════════════ */
export const getVendorReturnRequests = async (req, res, next) => {
    try {
        const vandorId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { vandorId };
        if (req.query.status) filter.status = req.query.status;

        const [returnRequests, total] = await Promise.all([
            ReturnRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: "userId", select: "name email phone" })
                .populate({ path: "items.product", select: "name thumbnail" })
                .populate({ path: "items.variant", select: "size color" })
                .lean(),
            ReturnRequest.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Vendor return requests fetched successfully",
            data: {
                returnRequests,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
