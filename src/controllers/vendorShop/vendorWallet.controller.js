import vendorTransactionModel from "../../models/vendorShop/vendorTransaction.model.js";
import Wallet from "../../models/vendorShop/vendorWallet.model.js";
import { settlementQueue } from "../../config/settlement.queue.js";
import APIError from "../../middlewares/errorHandler.js";
import mongoose from "mongoose";
import Order from "../../models/marketPlace/order.model.js";
import Product from "../../models/vendorShop/product.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Review from "../../models/user/review.model.js";
import Category from "../../models/category/category.model.js";

export const addSettlement = async (vendorId, orderId, amount, session) => {
  // ======================================================
  // VALIDATION
  // ======================================================
  console.log(vendorId, orderId, amount);
  if (!amount || amount <= 0) {
    throw new Error("Invalid settlement amount");
  }

  // ======================================================
  // GET OR CREATE WALLET
  // ======================================================

  const wallet = await Wallet.findOneAndUpdate(
    { vendorId },
    {
      $setOnInsert: {
        vendorId,
        totalBalance: 0,
        availableBalance: 0,
        onHoldBalance: 0,
      },
    },

    {
      new: true,
      upsert: true,
      session,
    },
  );

  // ======================================================
  // UPDATE WALLET
  // ======================================================

  wallet.onHoldBalance += amount;
  wallet.totalBalance += amount;

  await wallet.save({ session });

  // ======================================================
  // CREATE TRANSACTION
  // ======================================================

  const [transaction] = await vendorTransactionModel.create(
    [
      {
        vendorId,
        type: "ORDER_SETTLEMENT",
        amount,
        orderId,
        status: "HOLD",
        description: `Order ${orderId} settlement`,
      },
    ],
    { session },
  );

  // ======================================================
  // BULLMQ JOB
  // OUTSIDE MONGODB TRANSACTION
  // ======================================================

  const job = await settlementQueue.add(
    "walletSettlement",
    {
      vendorId,
      amount,
      transactionId: transaction._id,
    },
    {
      delay: 7 * 24 * 60 * 60 * 1000,
      jobId: `settlement-${transaction._id}`,

      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  // ======================================================
  // SAVE JOB ID
  // ======================================================

  transaction.settlementJobId = job.id;
  await transaction.save({ session });

  return transaction;
};
// export const addSettlement = async (vendorId, orderId, amount, session) => {
//   const wallet = await Wallet.findOne({ vendorId }).session(session);
//   if (!wallet) throw new Error("Wallet not found");

//   wallet.onHoldBalance += amount;
//   wallet.totalBalance += amount;
//   await wallet.save({ session });

//   const [transaction] = await vendorTransactionModel.create(
//     [
//       {
//         vendorId,
//         type: "ORDER_SETTLEMENT",
//         amount,
//         orderId,
//         status: "HOLD",
//         description: `Order ${orderId} settlement`,
//       },
//     ],
//     { session },
//   );

//   //  BullMQ always outside transaction
//   const job = await settlementQueue.add(
//     "walletSettlement",
//     {
//       vendorId,
//       amount,
//       transactionId: transaction._id,
//     },
//     {
//       delay: 7 * 24 * 60 * 60 * 1000,
//     },
//   );

//   transaction.settlementJobId = job.id;
//   await transaction.save();

//   return transaction;
// };

//order cancel or  return approve then call this function.
// export const cancelSettlement = async (vendorId, orderId) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();
//     const transaction = await vendorTransactionModel
//       .findOne({
//         vendorId,
//         orderId,
//         type: "ORDER_SETTLEMENT",
//       })
//       .session(session);

//     if (!transaction) {
//       throw new APIError(404, "Settlement transaction not found");
//     }

//     if (transaction.status !== "HOLD") {
//       throw new APIError(404, "Settlement already processed");
//     }

//     const wallet = await Wallet.findOne({ vendorId }).session(session);
//     wallet.onHoldBalance -= transaction.amount;
//     wallet.totalBalance -= transaction.amount;

//     await wallet.save({ session });
//     transaction.status = "CANCELLED";
//     await transaction.save({ session });

//     await session.commitTransaction();

//     // remove bullmq job
//     if (transaction.settlementJobId) {
//       const job = await settlementQueue.getJob(transaction.settlementJobId);
//       if (job) await job.remove();
//     }
//   } catch (err) {
//     await session.abortTransaction();
//     throw err;
//   } finally {
//     session.endSession();
//   }
// };

export const cancelSettlement = async (vendorId, orderId, session) => {
  try {
    const transaction = await vendorTransactionModel
      .findOne({
        vendorId,
        orderId,
        type: "ORDER_SETTLEMENT",
      })
      .session(session);

    if (!transaction) return;

    const wallet = await Wallet.findOne({ vendorId }).session(session);
    if (!wallet) throw new APIError("Wallet not found");

    // CASE 1  Settlement HOLD
    if (transaction.status === "HOLD") {
      wallet.onHoldBalance = Math.max(
        0,
        wallet.onHoldBalance - transaction.amount,
      );

      wallet.totalBalance = Math.max(
        0,
        wallet.totalBalance - transaction.amount,
      );

      await wallet.save({ session });

      transaction.status = "CANCELLED";
      await transaction.save({ session });

      // remove BullMQ job
      if (transaction.settlementJobId) {
        const job = await settlementQueue.getJob(transaction.settlementJobId);

        if (job && (await job.getState()) !== "completed") {
          await job.remove();
        }
      }

      return;
    }

    // CASE 2 Settlement already SUCCESS
    if (transaction.status === "SUCCESS") {
      wallet.availableBalance = Math.max(
        0,
        wallet.availableBalance - transaction.amount,
      );

      wallet.totalBalance = Math.max(
        0,
        wallet.totalBalance - transaction.amount,
      );

      await wallet.save({ session });

      // create refund transaction for vendor
      await vendorTransactionModel.create(
        [
          {
            vendorId,
            orderId,
            type: "REFUND",
            amount: transaction.amount,
            status: "SUCCESS",
            description: `Settlement reversed due to return for order ${orderId}`,
          },
        ],
        { session },
      );

      return;
    }
  } catch (error) {
    console.error("Cancel settlement failed:", error.message);
    throw error;
  }
};
//get wallet balance
// export const getWallet = async (req, res) => {
//   const vendorId = req.user.id;
//   const wallet = await Wallet.findOne({ vendorId });

//   if (!wallet) {
//     return res.status(404).json({
//       message: "Wallet not found",
//     });
//   }
//   const transactions = await vendorTransactionModel
//     .find({ vendorId })
//     .sort({ createdAt: -1 })
//     .limit(10);

//   res.json({
//     totalBalance: wallet.totalBalance,
//     available: wallet.availableBalance,
//     onHold: wallet.onHoldBalance,
//     transactions,
//   });
// };

export const getWallet = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const wallet = await Wallet.findOneAndUpdate(
      { vendorId },
      {
        $setOnInsert: {
          vendorId,
          totalBalance: 0,
          availableBalance: 0,
          onHoldBalance: 0,
        },
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    const now = new Date();

    const upcomingReleases = await vendorTransactionModel
      .find({
        vendorId,
        status: "HOLD",
        settlementJobId: { $exists: true, $ne: null },
      })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    const upcomingReleasesWithDates = await Promise.all(
      upcomingReleases.map(async (tx) => {
        let estimatedCreditDate = null;
        try {
          const job = await settlementQueue.getJob(tx.settlementJobId);
          if (job) {
            const jobState = await job.getState();
            if (jobState === "delayed") {
              const processedAt = job.processedOn || job.timestamp;
              const delayMs = tx.settlementJobId ? 7 * 24 * 60 * 60 * 1000 : 0;
              estimatedCreditDate = new Date(processedAt + delayMs);
            }
          }
        } catch (err) {
          estimatedCreditDate = null;
        }

        return {
          transactionId: tx._id,
          orderId: tx.orderId,
          amount: tx.amount,
          status: tx.status,
          type: tx.type,
          description: tx.description,
          createdAt: tx.createdAt,
          estimatedCreditDate: estimatedCreditDate || null,
        };
      }),
    );

    const recentTransactions = await vendorTransactionModel
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentTransactionsFormatted = recentTransactions.map((tx) => ({
      transactionId: tx._id,
      orderId: tx.orderId,
      amount: tx.amount,
      status: tx.status,
      type: tx.type,
      description: tx.description,
      createdAt: tx.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalBalance: wallet.totalBalance,
        availableBalance: wallet.availableBalance,
        onHoldBalance: wallet.onHoldBalance,
        upcomingReleases: upcomingReleasesWithDates,
        upcomingReleasesCount: upcomingReleasesWithDates.length,
        recentTransactions: recentTransactionsFormatted,
        recentTransactionsCount: recentTransactionsFormatted.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet",
      error: err.message,
    });
  }
};
//transaction history
export const getAllTransactionHistory = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const transactions = await vendorTransactionModel
      .find({ vendorId })
      .populate("bankAccountId", "accountNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await vendorTransactionModel.countDocuments({ vendorId });

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//single transation details
export const getTransactionDetails = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { transactionId } = req.params;

    const transaction = await vendorTransactionModel
      .findOne({ _id: transactionId, vendorId })
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          select: "firstName lastName phoneNumber email profileImage",
        },
      });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const order = transaction.orderId;
    const customer = order?.userId;

    const totalAmount = order?.totalAmount || 0;
    const vendorAmount = order?.netAmount || 0;
    const commission = totalAmount - vendorAmount;

    res.status(200).json({
      success: true,
      data: {
        transactionId: transaction._id,

        customerInfo: {
          name: `${customer?.firstName || ""} ${customer?.lastName || ""}`,
          phone: customer?.phoneNumber,
          email: customer?.email,
          profileImage: customer?.profileImage,
        },

        amountBreakdown: {
          totalAmount,
          commission,
          vendorReceivedAmount: vendorAmount,
        },

        invoiceUrl: order?.invoice,
        receiptUrl: order?.labelUrl,
        date: transaction.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//vendor earning analysis
export const getVendorEarningAnalytics = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const { type = "day", date } = req.query;

    const selectedDate = date ? new Date(date) : new Date();
    selectedDate.setHours(0, 0, 0, 0);

    let startDate;
    let endDate;
    let prevStartDate;
    let prevEndDate;

    if (type === "day") {
      startDate = new Date(selectedDate);
      endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      prevStartDate = new Date(selectedDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);

      prevEndDate = new Date(selectedDate);
    }

    if (type === "week") {
      startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 6);

      endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);

      prevEndDate = new Date(startDate);
    }

    if (type === "month") {
      startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );
      endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        1,
      );

      prevStartDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() - 1,
        1,
      );
      prevEndDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );
    }

    const result = await vendorTransactionModel.aggregate([
      {
        $match: {
          vendorId,
          status: "SETTLED",
          createdAt: { $gte: prevStartDate, $lt: endDate },
        },
      },

      {
        $facet: {
          currentRevenue: [
            {
              $match: { createdAt: { $gte: startDate, $lt: endDate } },
            },
            {
              $group: { _id: null, total: { $sum: "$amount" } },
            },
          ],

          previousRevenue: [
            {
              $match: { createdAt: { $gte: prevStartDate, $lt: prevEndDate } },
            },
            {
              $group: { _id: null, total: { $sum: "$amount" } },
            },
          ],

          chart: [
            {
              $match: { createdAt: { $gte: startDate, $lt: endDate } },
            },
            {
              $group: {
                _id:
                  type === "day"
                    ? { $hour: "$createdAt" }
                    : type === "week"
                      ? { $dayOfWeek: "$createdAt" }
                      : { $dayOfMonth: "$createdAt" },

                revenue: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const current = result[0].currentRevenue[0]?.total || 0;
    const previous = result[0].previousRevenue[0]?.total || 0;

    let growth = 0;

    if (previous > 0) {
      growth = ((current - previous) / previous) * 100;
    }

    res.json({
      success: true,

      data: {
        filter: type,
        selectedDate,
        revenue: current,
        previousRevenue: previous,
        growthPercentage: Number(growth.toFixed(2)),
        chart: result[0].chart,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};

//dashboard
export const getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { filter = "daily", date } = req.query;

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const baseMatch = {
      "items.vendorId": vendorObjectId,
      orderType: "SUB",
    };

    let startDate;
    let endDate;
    let prevStartDate;
    let prevEndDate;

    const selectedDate = date ? new Date(date) : new Date();

    if (filter === "daily") {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
    } else if (filter === "weekly") {
      const dayOfWeek = selectedDate.getDay();
      startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(prevEndDate.getDate() - 7);
    } else if (filter === "monthly") {
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();

      startDate = new Date(year, month, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(year, month - 1, 1);
      prevStartDate.setHours(0, 0, 0, 0);

      prevEndDate = new Date(year, month, 0);
      prevEndDate.setHours(23, 59, 59, 999);
    } else if (filter === "yearly") {
      const year = selectedDate.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      prevStartDate = new Date(year - 1, 0, 1);
      prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    }

    const timeFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    const prevTimeFilter = {
      createdAt: { $gte: prevStartDate, $lte: prevEndDate },
    };

    const totalSalesResult = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          status: "DELIVERED",
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);

    const totalOrdersResult = await Order.aggregate([
      { $match: baseMatch },
      { $count: "count" },
    ]);

    const avgOrdersResult = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          status: {
            $in: ["DELIVERED", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY"],
          },
        },
      },
      { $group: { _id: null, avgAmount: { $avg: "$netAmount" } } },
    ]);

    const deliveredOrdersResult = await Order.aggregate([
      { $match: { ...baseMatch, status: "DELIVERED" } },
      { $count: "count" },
    ]);

    let timeBasedSales = [];

    if (filter === "daily") {
      const hourlySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...timeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const hourGroups = [];
      for (let i = 0; i < 24; i += 3) {
        const endHour = i + 2;
        const matchingHours = hourlySales.filter(
          (h) => h._id >= i && h._id <= endHour,
        );
        const totalSales = matchingHours.reduce(
          (sum, h) => sum + h.totalSales,
          0,
        );
        const orderCount = matchingHours.reduce(
          (sum, h) => sum + h.orderCount,
          0,
        );
        hourGroups.push({
          timeRange: `${String(i).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:59`,
          totalSales,
          orderCount,
        });
      }

      const prevHourlySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...prevTimeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevHourGroups = [];
      for (let i = 0; i < 24; i += 3) {
        const endHour = i + 2;
        const matchingHours = prevHourlySales.filter(
          (h) => h._id >= i && h._id <= endHour,
        );
        const totalSales = matchingHours.reduce(
          (sum, h) => sum + h.totalSales,
          0,
        );
        prevHourGroups.push({ totalSales });
      }

      timeBasedSales = hourGroups.map((group, idx) => {
        const prevSales = prevHourGroups[idx]?.totalSales || 0;
        let growth = 0;
        if (prevSales > 0) {
          growth = ((group.totalSales - prevSales) / prevSales) * 100;
        }
        return {
          timeRange: group.timeRange,
          totalSales: group.totalSales,
          orderCount: group.orderCount,
          growthPercentage: Number(growth.toFixed(2)),
        };
      });
    } else if (filter === "weekly") {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const dailySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...timeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevDailySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...prevTimeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevDayMap = {};
      prevDailySales.forEach((d) => {
        prevDayMap[d._id] = d.totalSales;
      });

      timeBasedSales = dayNames.map((dayName, idx) => {
        const dayNum = idx + 1;
        const dayData = dailySales.find((d) => d._id === dayNum);
        const totalSales = dayData?.totalSales || 0;
        const orderCount = dayData?.orderCount || 0;
        const prevSales = prevDayMap[dayNum] || 0;
        let growth = 0;
        if (prevSales > 0) {
          growth = ((totalSales - prevSales) / prevSales) * 100;
        }
        return {
          day: dayName,
          totalSales,
          orderCount,
          growthPercentage: Number(growth.toFixed(2)),
        };
      });
    } else if (filter === "monthly") {
      const daysInMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
      ).getDate();

      const dailySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...timeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevDailySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...prevTimeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevDayMap = {};
      prevDailySales.forEach((d) => {
        prevDayMap[d._id] = d.totalSales;
      });

      timeBasedSales = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayData = dailySales.find((d) => d._id === day);
        const totalSales = dayData?.totalSales || 0;
        const orderCount = dayData?.orderCount || 0;
        const prevSales = prevDayMap[day] || 0;
        let growth = 0;
        if (prevSales > 0) {
          growth = ((totalSales - prevSales) / prevSales) * 100;
        }
        timeBasedSales.push({
          day,
          totalSales,
          orderCount,
          growthPercentage: Number(growth.toFixed(2)),
        });
      }
    } else if (filter === "yearly") {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const monthlySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...timeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevMonthlySales = await Order.aggregate([
        {
          $match: {
            ...baseMatch,
            ...prevTimeFilter,
            status: "DELIVERED",
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalSales: { $sum: "$netAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const prevMonthMap = {};
      prevMonthlySales.forEach((m) => {
        prevMonthMap[m._id] = m.totalSales;
      });

      timeBasedSales = monthNames.map((monthName, idx) => {
        const monthNum = idx + 1;
        const monthData = monthlySales.find((m) => m._id === monthNum);
        const totalSales = monthData?.totalSales || 0;
        const orderCount = monthData?.orderCount || 0;
        const prevSales = prevMonthMap[monthNum] || 0;
        let growth = 0;
        if (prevSales > 0) {
          growth = ((totalSales - prevSales) / prevSales) * 100;
        }
        return {
          month: monthName,
          monthNumber: monthNum,
          totalSales,
          orderCount,
          growthPercentage: Number(growth.toFixed(2)),
        };
      });
    }

    const totalSalesCurrent = totalSalesResult[0]?.total || 0;
    const totalOrders = totalOrdersResult[0]?.count || 0;
    const avgOrderValue = avgOrdersResult[0]?.avgAmount || 0;
    const deliveredOrders = deliveredOrdersResult[0]?.count || 0;

    let prevTotalSalesResult = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...prevTimeFilter,
          status: "DELIVERED",
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);

    const prevTotalSales = prevTotalSalesResult[0]?.total || 0;
    let overallGrowth = 0;
    if (prevTotalSales > 0) {
      overallGrowth =
        ((totalSalesCurrent - prevTotalSales) / prevTotalSales) * 100;
    }

    const topSellingProducts = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...timeFilter,
          status: "DELIVERED",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $group: {
          _id: "$items.productId",
          soldCount: { $sum: "$items.quantity" },
          totalAmount: {
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
          name: "$product.name",
          image: { $arrayElemAt: ["$product.images", 0] },
          soldCount: 1,
          totalAmount: { $round: ["$totalAmount", 2] },
        },
      },
    ]);

    const topRatedProducts = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...timeFilter,
          status: "DELIVERED",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $group: {
          _id: "$items.productId",
        },
      },
      { $limit: 50 },
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
        $match: { "product.reviewCount": { $gt: 0 } },
      },
      { $sort: { "product.avgRating": -1 } },
      { $limit: 5 },
      {
        $project: {
          productId: "$_id",
          name: "$product.name",
          image: { $arrayElemAt: ["$product.images", 0] },
          reviewCount: "$product.reviewCount",
          avgRating: "$product.avgRating",
        },
      },
    ]);

    const categoryWiseSales = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...timeFilter,
          status: "DELIVERED",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product.categoryId",
          totalSaleAmount: {
            $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
          },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSaleAmount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryId: "$_id",
          categoryName: "$category.name",
          totalSaleAmount: { $round: ["$totalSaleAmount", 2] },
          orderCount: 1,
        },
      },
    ]);

    const retailBulkResult = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          ...timeFilter,
          status: "DELIVERED",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "variants",
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$variant.Type",
          totalSaleAmount: {
            $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
          },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const retailData = retailBulkResult.find((r) => r._id === "RETAIL") || {
      totalSaleAmount: 0,
      orderCount: 0,
    };
    const bulkData = retailBulkResult.find((r) => r._id === "BULK") || {
      totalSaleAmount: 0,
      orderCount: 0,
    };

    const retailTotal = retailData.totalSaleAmount || 0;
    const bulkTotal = bulkData.totalSaleAmount || 0;
    const combinedTotal = retailTotal + bulkTotal;

    let retailPercentage = 0;
    let bulkPercentage = 0;
    if (combinedTotal > 0) {
      retailPercentage = Number(
        ((retailTotal / combinedTotal) * 100).toFixed(2),
      );
      bulkPercentage = Number(((bulkTotal / combinedTotal) * 100).toFixed(2));
    }

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return res.status(200).json({
      success: true,
      data: {
        filter,
        selectedDate: selectedDate.toISOString().split("T")[0],
        monthName:
          filter === "monthly"
            ? monthNames[selectedDate.getMonth()]
            : undefined,
        summary: {
          totalSalesBalance: Number(totalSalesCurrent.toFixed(2)),
          totalOrders,
          avgOrderValue: Number(avgOrderValue.toFixed(2)),
          deliveredOrders,
          overallGrowthPercentage: Number(overallGrowth.toFixed(2)),
        },
        timeBasedSales,
        topSellingProducts,
        topRatedProducts,
        categoryWiseSales,
        orderTypeBreakdown: {
          retail: {
            totalSaleAmount: Number(retailTotal.toFixed(2)),
            orderCount: retailData.orderCount || 0,
            percentage: retailPercentage,
          },
          bulk: {
            totalSaleAmount: Number(bulkTotal.toFixed(2)),
            orderCount: bulkData.orderCount || 0,
            percentage: bulkPercentage,
          },
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor analytics",
      error: err.message,
    });
  }
};

export const getAllTopSellingProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      filter = "daily",
      date,
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const selectedDate = date ? new Date(date) : new Date();

    let startDate;
    let endDate;
    let prevStartDate;
    let prevEndDate;

    if (filter === "daily") {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
    } else if (filter === "weekly") {
      const dayOfWeek = selectedDate.getDay();
      startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(prevEndDate.getDate() - 7);
    } else if (filter === "monthly") {
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();

      startDate = new Date(year, month, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(year, month - 1, 1);
      prevStartDate.setHours(0, 0, 0, 0);

      prevEndDate = new Date(year, month, 0);
      prevEndDate.setHours(23, 59, 59, 999);
    } else if (filter === "yearly") {
      const year = selectedDate.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      prevStartDate = new Date(year - 1, 0, 1);
      prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    }

    const timeFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    const baseMatch = {
      "items.vendorId": vendorObjectId,
      orderType: "SUB",
      status: "DELIVERED",
      ...timeFilter,
    };

    const searchMatch = search
      ? { "product.name": { $regex: search, $options: "i" } }
      : {};

    const aggregationPipeline = [
      { $match: baseMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      aggregationPipeline.push({ $match: searchMatch });
    }

    const currentProducts = await Order.aggregate([
      ...aggregationPipeline,
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$product.name" },
          productImage: { $first: { $arrayElemAt: ["$product.images", 0] } },
          avgRating: { $first: "$product.avgRating" },
          soldCount: { $sum: "$items.quantity" },
          totalSaleAmount: {
            $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
          },
        },
      },
      { $sort: { soldCount: -1 } },
    ]);

    const prevAggregationPipeline = [
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      prevAggregationPipeline.push({ $match: searchMatch });
    }

    const prevProducts = await Order.aggregate([
      ...prevAggregationPipeline,
      {
        $group: {
          _id: "$items.productId",
          totalSaleAmount: {
            $sum: { $multiply: ["$items.finalPrice", "$items.quantity"] },
          },
        },
      },
    ]);

    const prevProductMap = {};
    prevProducts.forEach((p) => {
      prevProductMap[p._id.toString()] = p.totalSaleAmount;
    });

    const total = currentProducts.length;

    const paginatedProducts = currentProducts.slice(skip, skip + limitNum);

    const formattedProducts = paginatedProducts.map((product) => {
      const prevAmount = prevProductMap[product._id.toString()] || 0;
      let growthPercentage = 0;
      if (prevAmount > 0) {
        growthPercentage =
          ((product.totalSaleAmount - prevAmount) / prevAmount) * 100;
      }
      return {
        productId: product._id,
        productName: product.productName,
        productImage: product.productImage,
        avgRating: product.avgRating || 0,
        soldCount: product.soldCount,
        totalSaleAmount: Number(product.totalSaleAmount.toFixed(2)),
        growthPercentage: Number(growthPercentage.toFixed(2)),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        filter,
        selectedDate: selectedDate.toISOString().split("T")[0],
        search,
        products: formattedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top selling products",
      error: err.message,
    });
  }
};

export const getAllTopRatedProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      filter = "daily",
      date,
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const selectedDate = date ? new Date(date) : new Date();

    let startDate;
    let endDate;

    if (filter === "daily") {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "weekly") {
      const dayOfWeek = selectedDate.getDay();
      startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "monthly") {
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();

      startDate = new Date(year, month, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "yearly") {
      const year = selectedDate.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    const timeFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    const baseMatch = {
      "items.vendorId": vendorObjectId,
      orderType: "SUB",
      status: "DELIVERED",
      ...timeFilter,
    };

    const soldProducts = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendorObjectId } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$product.name" },
          productImage: { $first: { $arrayElemAt: ["$product.images", 0] } },
          avgRating: { $first: "$product.avgRating" },
          reviewCount: { $first: "$product.reviewCount" },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$netAmount" },
        },
      },
    ]);

    let filteredProducts = soldProducts;
    if (search) {
      filteredProducts = soldProducts.filter((p) =>
        p.productName.toLowerCase().includes(search.toLowerCase()),
      );
    }

    filteredProducts.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

    const total = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(skip, skip + limitNum);

    const formattedProducts = paginatedProducts.map((product) => ({
      productId: product._id,
      productName: product.productName,
      productImage: product.productImage,
      avgRating: product.avgRating || 0,
      reviewCount: product.reviewCount || 0,
      totalOrders: product.totalOrders,
      totalRevenue: Number(product.totalRevenue.toFixed(2)),
    }));

    return res.status(200).json({
      success: true,
      data: {
        filter,
        selectedDate: selectedDate.toISOString().split("T")[0],
        search,
        products: formattedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top rated products",
      error: err.message,
    });
  }
};

// // Example: When you need to update wallet AND create transaction atomically
// export const updateWalletBalance = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();
//     const { vendorId, amount } = req.body;

//     // Update wallet
//     const wallet = await Wallet.findOneAndUpdate(
//       { vendorId },
//       { $inc: { totalBalance: amount } },
//       { new: true, session },
//     );

//     if (!wallet) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Wallet not found" });
//     }

//     // Create transaction record
//     const transaction = await vendorTransactionModel.create(
//       [
//         {
//           vendorId,
//           amount,
//           type: "credit",
//           description: "Wallet top-up",
//         },
//       ],
//       { session },
//     );

//     await session.commitTransaction();

//     res.json({
//       success: true,
//       wallet,
//       transaction: transaction[0],
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };
