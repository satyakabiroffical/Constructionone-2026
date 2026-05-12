import vendorTransactionModel from "../../models/vendorShop/vendorTransaction.model.js";
import vendorWalletModel from "../../models/vendorShop/vendorWallet.model.js";
import vendorWithdrawalBalanceModel from "../../models/vendorShop/vendorWithdrawalBalance.model.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import adminTransaction from "../../models/admin/adminTransaction.model.js";
import transactionModel from "../../models/user/transaction.model.js";
import adminTransactionModel from "../../models/admin/adminTransaction.model.js";

// export const requestWithdraw = async (req, res) => {
//   const vendorId = req.user.id;
//   const { amount, bankAccountId } = req.body;

//   const wallet = await vendorWalletModel.findOne({ vendorId });

//   if (wallet.availableBalance < amount) {
//     return res.status(400).json({
//       message: "Insufficient balance",
//     });
//   }

//   const request = await vendorWithdrawalBalanceModel.create({
//     vendorId,
//     amount,
//     bankAccountId: bankAccountId || "",
//   });

//   res.json({
//     success: true,
//     message: "Withdrawal request sent",
//     data: request,
//   });
// };

// export const approveWithdraw = async (req, res) => {
//   const { withdrawalId } = req.params;

//   const withdrawal = await vendorWithdrawalBalanceModel.findById(withdrawalId);
//   const wallet = await vendorWalletModel.findOne({
//     vendorId: withdrawal.vendorId,
//   });

//   wallet.availableBalance -= withdrawal.amount;
//   wallet.totalBalance -= withdrawal.amount;

//   await wallet.save();

//   withdrawal.status = "APPROVED";
//   await withdrawal.save();

//   await vendorTransactionModel.create({
//     vendorId: withdrawal.vendorId,
//     type: "WITHDRAWAL",
//     amount: withdrawal.amount,
//     status: "COMPLETED",
//     description: "Withdrawal to bank",
//   });

//   res.json({
//     success: true,
//     message: "Withdrawal approved",
//   });
// };

// export const rejectWithdraw = async (req, res) => {
//   const { withdrawalId } = req.params;

//   const withdrawal = await vendorWithdrawalBalanceModel.findById(withdrawalId);

//   if (!withdrawal) {
//     return res.status(404).json({ message: "Request not found" });
//   }

//   const wallet = await vendorWalletModel.findOne({
//     vendorId: withdrawal.vendorId,
//   });

//   wallet.pendingWithdrawal -= withdrawal.amount;

//   await wallet.save();

//   withdrawal.status = "REJECTED";
//   withdrawal.adminNote = "Bank details invalid";

//   await withdrawal.save();

//   res.json({
//     success: true,
//     message: "Withdrawal rejected",
//   });
// };

export const requestWithdraw = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { amount, bankAccountId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const wallet = await vendorWalletModel.findOne({ vendorId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Check existing pending request
    const existingRequest = await vendorWithdrawalBalanceModel.findOne({
      vendorId,
      status: "PENDING",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending withdrawal request. Wait until it is approved or rejected.",
      });
    }

    // Balance check
    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    const request = await vendorWithdrawalBalanceModel.create({
      vendorId,
      amount,
      bankAccountId: bankAccountId || null,
      status: "PENDING",
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal request sent successfully",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAllWithdrawalRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const withdrawals = await vendorWithdrawalBalanceModel
      .find(query)
      .populate("vendorId", "firstName lastName phoneNumber email ")
      .populate(
        "bankAccountId",
        "accountHolderName accountNumber accountType ifscCode bankName upiId",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await vendorWithdrawalBalanceModel.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: withdrawals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveWithdraw = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { withdrawalId } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const withdrawal = await vendorWithdrawalBalanceModel
      .findById(withdrawalId)
      .session(session);

    if (!withdrawal) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    // Prevent duplicate approval/rejection
    if (withdrawal.status !== "PENDING") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Withdrawal already ${withdrawal.status.toLowerCase()}`,
      });
    }

    const wallet = await vendorWalletModel
      .findOne({ vendorId: withdrawal.vendorId })
      .session(session);

    if (!wallet) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Double balance check for safety
    if (wallet.availableBalance < withdrawal.amount) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Deduct balance
    wallet.availableBalance -= withdrawal.amount;

    // Optional future use
    wallet.totalBalance -= withdrawal.amount;

    await wallet.save({ session });

    // Update withdrawal
    withdrawal.status = "APPROVED";

    await withdrawal.save({ session });

    // Vendor transaction
    await vendorTransactionModel.create(
      [
        {
          vendorId: withdrawal.vendorId,
          type: "WITHDRAWAL",
          transactionId,
          amount: withdrawal.amount,
          status: "SUCCESS",
          description: `₹${withdrawal.amount} withdrawn and credited to bank account`,
          bankAccountId: withdrawal.bankAccountId,
          referenceId: withdrawal._id,
        },
      ],
      { session },
    );

    // Admin transaction
    await adminTransaction.create(
      [
        {
          vendorId: withdrawal.vendorId,
          transactionId,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          amount: withdrawal.amount,
          description: `₹${withdrawal.amount} withdrawal approved`,
          referenceId: withdrawal._id,
          referenceModel: "Withdrawal",
          bankAccountId: withdrawal.bankAccountId,
          processedBy: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Withdrawal approved successfully",
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const rejectWithdraw = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawal = await vendorWithdrawalBalanceModel
      .findById(withdrawalId)
      .session(session);

    if (!withdrawal) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    // Prevent duplicate action
    if (withdrawal.status !== "PENDING") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Withdrawal already ${withdrawal.status.toLowerCase()}`,
      });
    }

    // Update withdrawal status
    withdrawal.status = "REJECTED";
    withdrawal.rejectReason = reason || "Rejected by admin";

    await withdrawal.save({ session });

    // Admin transaction log
    await adminTransaction.create(
      [
        {
          vendorId: withdrawal.vendorId,
          type: "WITHDRAWAL",
          status: "REJECTED",
          amount: withdrawal.amount,
          description: `₹${withdrawal.amount} withdrawal rejected`,
          referenceId: withdrawal._id,
          referenceModel: "Withdrawal",
          bankAccountId: withdrawal.bankAccountId,
          processedBy: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Withdrawal rejected successfully",
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const downloadStatementPDF = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { from, to, status } = req.query;

    let filter = { vendorId };

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    if (status) {
      filter.status = status;
    }

    const withdrawals = await vendorWithdrawalBalanceModel
      .find(filter)
      .populate("bankAccountId")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=statement.pdf");

    doc.pipe(res);

    doc.fontSize(18).text("Vendor Withdrawal Statement", {
      align: "center",
    });

    doc.moveDown();

    doc.fontSize(10).text(`From: ${from || "All"}  To: ${to || "All"}`);

    doc.moveDown();

    doc
      .fontSize(12)
      .text("Date       | Amount | Status     | Bank       | Account");

    doc.moveDown();

    withdrawals.forEach((item) => {
      const row = `
${item.createdAt.toISOString().split("T")[0]} | 
${item.amount} | 
${item.status} | 
${item.bankAccountId?.bankName || "-"} | 
${item.bankAccountId?.accountNumber || "-"}`;

      doc.fontSize(10).text(row);
      doc.moveDown();
    });

    const total = withdrawals.reduce((sum, i) => sum + i.amount, 0);
    doc.moveDown();
    doc.fontSize(12).text(`Total Withdrawn: ₹${total}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAdminTransactionsHistory = async (req, res) => {
  try {
    const adminId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { type, status, vendorId, startDate, endDate } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;

    if (vendorId) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await adminTransaction
      .find(filter)
      .populate("vendorId", "firstName lastName email phoneNumber")
      .populate("bankAccountId", "accountHolderName accountNumber bankName")
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await adminTransaction.countDocuments(filter);

    const data = transactions.map((tx) => ({
      id: tx._id,

      vendor: tx.vendorId
        ? {
            id: tx.vendorId._id,
            name: `${tx.vendorId.firstName} ${tx.vendorId.lastName}`,
            email: tx.vendorId.email,
            phone: tx.vendorId.phoneNumber,
          }
        : null,

      type: tx.type,
      status: tx.status,

      amount: tx.amount,
      fee: tx.fee || 0,
      netAmount: tx.netAmount || tx.amount,

      description: tx.description,

      referenceId: tx.referenceId,
      referenceModel: tx.referenceModel,

      bank: tx.bankAccountId
        ? {
            accountHolderName: tx.bankAccountId.accountHolderName,
            accountNumber: `****${tx.bankAccountId.accountNumber?.slice(-4)}`,
            bankName: tx.bankAccountId.bankName,
          }
        : null,

      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,

      processedBy: tx.processedBy
        ? {
            id: tx.processedBy._id,
            name: tx.processedBy.name,
            email: tx.processedBy.email,
          }
        : null,

      createdAt: tx.createdAt,

      displayText: `₹${tx.amount} sent to ${
        tx.vendorId
          ? `${tx.vendorId.firstName} ${tx.vendorId.lastName}`
          : "Unknown Vendor"
      }`,
    }));

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getVendorWithdrawalRequests = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const withdrawals = await vendorWithdrawalBalanceModel
      .find({ vendorId })
      .populate(
        "bankAccountId",
        "accountHolderName accountNumber accountType ifscCode bankName upiId",
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getAlltransaction for Admin - including user and admin :
export const getAllTransactionsHistory = async (req, res, next) => {
  try {
    // const cacheKey = `transactions:history:${JSON.stringify(req.query)}`;

    // const cachedData = await redis.get(cacheKey);

    // if (cachedData) {
    //   return res.json(JSON.parse(cachedData));
    // }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      search = "",
      type,
      status,
      vendorId,
      filterType,
      startDate,
      endDate,
    } = req.query;

    // =====================================================
    // DATE FILTER
    // =====================================================

    let dateFilter = {};

    const today = new Date();

    if (filterType === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    } else if (filterType === "yesterday") {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };
    } else if (filterType === "last7days") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);

      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: new Date(),
        },
      };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};

      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // =====================================================
    // USER TRANSACTION FILTER
    // =====================================================

    const transactionFilter = {
      ...dateFilter,
    };

    if (search) {
      transactionFilter.$or = [
        { razorpayOrderId: { $regex: search, $options: "i" } },
        { razorpayPaymentId: { $regex: search, $options: "i" } },
        { razorpaySignature: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { payType: { $regex: search, $options: "i" } },
        { walletPurpose: { $regex: search, $options: "i" } },
        { walletType: { $regex: search, $options: "i" } },
        { currency: { $regex: search, $options: "i" } },
      ];
    }

    // =====================================================
    // ADMIN TRANSACTION FILTER
    // =====================================================

    const adminFilter = {
      ...dateFilter,
    };

    if (type) adminFilter.type = type;

    if (status) adminFilter.status = status;

    if (vendorId) {
      adminFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    // =====================================================
    // FETCH DATA
    // =====================================================

    const [userTransactions, userTotal, adminTransactions, adminTotal] =
      await Promise.all([
        // USER TRANSACTIONS
        transactionModel
          .find(transactionFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        transactionModel.countDocuments(transactionFilter),

        // ADMIN TRANSACTIONS
        adminTransactionModel
          .find(adminFilter)
          .populate("vendorId", "firstName lastName email phoneNumber")
          .populate("bankAccountId", "accountHolderName accountNumber bankName")
          .populate("processedBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        adminTransactionModel.countDocuments(adminFilter),
      ]);

    // =====================================================
    // FORMAT ADMIN DATA
    // =====================================================

    const formattedAdminTransactions = adminTransactions.map((tx) => ({
      id: tx._id,
      transactionType: "ADMIN",

      vendor: tx.vendorId
        ? {
            id: tx.vendorId._id,
            name: `${tx.vendorId.firstName} ${tx.vendorId.lastName}`,
            email: tx.vendorId.email,
            phone: tx.vendorId.phoneNumber,
          }
        : null,

      type: tx.type,
      status: tx.status,

      amount: tx.amount,
      fee: tx.fee || 0,
      netAmount: tx.netAmount || tx.amount,

      description: tx.description,

      referenceId: tx.referenceId,
      referenceModel: tx.referenceModel,

      bank: tx.bankAccountId
        ? {
            accountHolderName: tx.bankAccountId.accountHolderName,
            accountNumber: `****${tx.bankAccountId.accountNumber?.slice(-4)}`,
            bankName: tx.bankAccountId.bankName,
          }
        : null,

      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,

      processedBy: tx.processedBy
        ? {
            id: tx.processedBy._id,
            name: tx.processedBy.name,
            email: tx.processedBy.email,
          }
        : null,

      createdAt: tx.createdAt,
    }));

    // =====================================================
    // FORMAT USER DATA
    // =====================================================

    const formattedUserTransactions = userTransactions.map((tx) => ({
      ...tx,
      transactionType: "USER",
    }));

    // =====================================================
    // COMBINE + SORT
    // =====================================================

    const combinedTransactions = [
      ...formattedUserTransactions,
      ...formattedAdminTransactions,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // =====================================================
    // RESPONSE
    // =====================================================

    const result = {
      success: true,
      page,
      limit,

      totalUserTransactions: userTotal,
      totalAdminTransactions: adminTotal,

      totalTransactions: userTotal + adminTotal,

      data: combinedTransactions,
    };

    // await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// const downloadPDF = async () => {
//   const res = await axios.get(
//     "/api/vendor/bank/statement/pdf?from=2026-01-01&to=2026-03-01",
//     { responseType: "blob" }
//   );
