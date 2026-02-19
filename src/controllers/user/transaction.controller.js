// src/controllers/transaction.controller.js   by priyanshu

import Transaction from "../../models/user/transaction.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import redis from "../../config/redis.config.js";




const buildFilter = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.paymentGateway) filter.paymentGateway = query.paymentGateway;
  if (query.userId) filter.userId = query.userId;

  // Date Range Filter
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  return filter;
};


export const getAllTransactions = async (req, res, next) => {
  try {

    const cacheKey = `transactions:all:${JSON.stringify(req.query)}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    
    filter.or=[
        {razorpayOrderId:{$regex:search,$options:"i"}},
        {razorpayPaymentId:{$regex:search,$options:"i"}},
        {razorpaySignature:{$regex:search,$options:"i"}},
        {paymentMethod:{$regex:search,$options:"i"}},
        {status:{$regex:search,$options:"i"}},
        {payType:{$regex:search,$options:"i"}},
        {walletPurpose:{$regex:search,$options:"i"}},
        {walletType:{$regex:search,$options:"i"}},
        {currency:{$regex:search,$options:"i"}},
        {amount:{$regex:search,$options:"i"}},
        {userId:{$regex:search,$options:"i"}},
        {createdAt:{$regex:search,$options:"i"}},
        {updatedAt:{$regex:search,$options:"i"}},
    ]

    const filter = buildFilter(req.query);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(req.query.sort || "-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(), 
      Transaction.countDocuments(filter)
    ]);

    const result = {
      status: "success",
      message: "Transactions retrieved successfully",
      results: transactions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: { transactions }
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    res.json(result);

  } catch (error) {
    next(error);
  }
};


export const getTransactionById = async (req, res, next) => {
  try {

    const { id } = req.params;

    const cacheKey = `transaction:${id}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const transaction = await Transaction.findById(id).lean();

    if (!transaction) {
      return next(new APIError("No transaction found with that ID", 404));
    }

    const result = {
      status: "success",
      message: "Transaction retrieved successfully",
      results: 1,
      data: { transaction }
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    res.json(result);

  } catch (error) {
    next(error);
  }
};


export const getTransactionsByUserId = async (req, res, next) => {
  try {

    const { userId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = buildFilter(req.query);

    filter.or=[
        {razorpayOrderId:{$regex:search,$options:"i"}},
        {razorpayPaymentId:{$regex:search,$options:"i"}},
        {razorpaySignature:{$regex:search,$options:"i"}},
        {paymentMethod:{$regex:search,$options:"i"}},
        {status:{$regex:search,$options:"i"}},
        {payType:{$regex:search,$options:"i"}},
        {walletPurpose:{$regex:search,$options:"i"}},
        {walletType:{$regex:search,$options:"i"}},
        {currency:{$regex:search,$options:"i"}},
        {amount:{$regex:search,$options:"i"}},
        {userId:{$regex:search,$options:"i"}},
        {createdAt:{$regex:search,$options:"i"}},
        {updatedAt:{$regex:search,$options:"i"}},
    ]

    const cacheKey = `transactions:user:${userId}:${JSON.stringify(req.query)}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(req.query.sort || "-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    const result = {
      status: "success",
      message: "User transactions retrieved successfully",
      results: transactions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: { transactions }
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    res.json(result);

  } catch (error) {
    next(error);
  }
};
