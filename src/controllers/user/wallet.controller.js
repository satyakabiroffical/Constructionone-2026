// written by priyanshu (ES Module version with Redis caching)

import mongoose from "mongoose";
import razorpay from "../../config/razorpay.conifg.js";
import transactionModel from "../../models/user/transaction.model.js";
import walletModel from "../../models/user/wallet.model.js";
import companyModel from "../../models/admin/company.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import crypto from "crypto";
import redis from "../../config/redis.config.js";


const getOrCreateWallet = async (userId, session = null) => {
  let wallet = await walletModel.findOne({ userId }).session(session);

  if (!wallet) {
    const created = await walletModel.create(
      [{ userId, balance: 0 }],
      { session }
    );
    wallet = created[0];
  }

  return wallet;
};




export const getMyWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // const userId = "6992ebf155e45f668bce5b09";
    const cacheKey = `wallet:${userId}`;

    const cachedWallet = await redis.get(cacheKey);

    if (cachedWallet) {
      console.log("Wallet fetched from Redis");
      return res.status(200).json(JSON.parse(cachedWallet));
    }

    const wallet = await getOrCreateWallet(userId);

    const result = {
      success: true,
      data: wallet
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};





export const createWalletTopup = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, walletType } = req.body;
    const userId = req.user.id;
    // console.log(userId);

    if (!amount) {
      throw new APIError(400, "Amount required");
    }

    if (walletType === "addOnce") {
      const company = await companyModel.findOne();

      if (!company) {
        throw new APIError(404, "Company config not found");
      }

      if (!company.walletTopupAmounts.includes(Number(amount))) {
        throw new APIError(400, "Invalid top-up amount");
      }
    }
    
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
    });

    const [transaction] = await transactionModel.create(
      [{
        userId,
        amount,
        currency: "INR",
        paymentGateway: "RAZORPAY",
        razorpayOrderId: order.id,
        status: "PENDING",
        payType: "CREDIT",
        walletPurpose: "TOPUP",
        walletType,
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      order,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};




export const verifyWalletTopup = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    console.log(req.body);
    const userId = req.user._id;
    // const userId = "6992ebf155e45f668bce5b09";

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid signature");
    }

    const transaction = await transactionModel
      .findOne({
        razorpayOrderId: razorpay_order_id,
        userId,
      })
      .session(session);

    // console.log(transaction);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "SUCCESS") {
      throw new Error("Already processed");
    }

    const wallet = await getOrCreateWallet(userId, session);
    await walletModel.findByIdAndUpdate(
      wallet._id,
      { $inc: { balance: transaction.amount } },
      { new: true, session },
    );

    transaction.status = "SUCCESS";
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paymentMethod = "ONLINE";

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    const cacheKey = `wallet:${userId}`;
    await redis.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Wallet credited successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getWalletHistory = async (req, res, next) => {

  try {

    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `wallet:history:${userId}:${page}:${limit}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
    const filter = {
      userId,
      status: { $in: ["SUCCESS", "FAILED", "REFUNDED", "CREATED"] },
      walletPurpose: {$in: ["TOPUP", "ORDER_PAYMENT", "BOOKING_PAYMENT", "REFUND"]},
      $or:[
        {paymentGateway: "RAZORPAY" },
        {paymentMethod: "WALLET" }
      ]
      
    }

    const [wallet, history] = await Promise.all([
      walletModel.findOne({ userId }),
      transactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ])
    
    const result = {
      success: true,
      wallet,
      history,
      pagination: {
        page,
        limit,
        total: history.length
      }
    }
    await redis.set(cacheKey, JSON.stringify(result), "EX", 120);

    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}