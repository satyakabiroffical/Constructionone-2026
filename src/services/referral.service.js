/**
 * Written by Pradeep
 */
import mongoose from "mongoose";
import Referral from "../models/referral/referral.model.js";
import Wallet from "../models/user/wallet.model.js";
import Transaction from "../models/user/transaction.model.js";
import Order from "../models/marketPlace/order.model.js";

// ─── MVP Config (hardcoded for now) ──────────────────────────────────────────
const REFERRER_REWARD = 100;  // User A ko milega
const REFEREE_REWARD = 50;   // User B ko milega
const MIN_ORDER_AMOUNT = 500;  // minimum order value for reward

// ─── Helper: credit wallet + create transaction record ──────────────────────
const creditWallet = async (userId, amount, orderId, session) => {
    await Promise.all([
        Wallet.findOneAndUpdate(
            { userId },
            { $inc: { balance: amount }, $setOnInsert: { userId } },
            { session, upsert: true, new: true }
        ),
        Transaction.create(
            [{
                userId,
                orderId,
                amount,
                paymentMethod: "WALLET",
                status: "SUCCESS",
                payType: "CREDIT",
                walletPurpose: "REFERRAL_REWARD",
            }],
            { session }
        ),
    ]);
};

// ─── Called at registration: create PENDING referral record ─────────────────
export const createReferral = async (referrerId, refereeId) => {
    // refereeId uniqueness is enforced by the model index — safe to just try/create
    await Referral.create({ referrerId, refereeId });
};

// ─── Called when master order status becomes DELIVERED ───────────────────────
// This is fire-and-forget — do NOT await this in order controller
export const processReward = async (masterOrderId, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Step 1: Check if this user was referred
        const referral = await Referral.findOneAndUpdate(
            { refereeId: userId, status: "PENDING", rewarded: false },
            { $set: { rewarded: true } }, // atomic claim — prevent double reward
            { session, new: true }
        );

        if (!referral) {
            // User was not referred OR already rewarded — skip silently
            await session.abortTransaction();
            session.endSession();
            return;
        }

        // Step 2: Validate order amount
        const masterOrder = await Order.findById(masterOrderId)
            .select("totalAmount userId")
            .lean()
            .session(session);

        if (!masterOrder || masterOrder.totalAmount < MIN_ORDER_AMOUNT) {
            // Order value below minimum — rollback the atomic claim
            await session.abortTransaction();
            session.endSession();
            return;
        }

        // Step 3: Credit referrer + referee wallets in parallel
        await Promise.all([
            creditWallet(referral.referrerId, REFERRER_REWARD, masterOrderId, session),
            creditWallet(referral.refereeId, REFEREE_REWARD, masterOrderId, session),
        ]);

        // Step 4: Mark referral COMPLETED
        await Referral.updateOne(
            { _id: referral._id },
            {
                $set: {
                    status: "COMPLETED",
                    orderId: masterOrderId,
                    referrerReward: REFERRER_REWARD,
                    refereeReward: REFEREE_REWARD,
                },
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        // Silent fail — this is background task, don't crash main request
    }
};
