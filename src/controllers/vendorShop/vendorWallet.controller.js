import vendorTransactionModel from "../../models/vendorShop/vendorTransaction.model.js";
import Wallet from "../../models/vendorShop/vendorWallet.model.js";
import { settlementQueue } from "../../config/settlement.queue.js";

export const addSettlement = async (vendorId, orderId, amount) => {
  const wallet = await Wallet.findOne({ vendorId });
  if (!wallet) return;

  // wallet hold balance update
  wallet.onHoldBalance += amount;
  wallet.totalBalance += amount;
  await wallet.save();

  // transaction create
  const transaction = await vendorTransactionModel.create({
    vendorId,
    type: "ORDER_SETTLEMENT",
    amount,
    orderId,
    status: "HOLD",
    description: `Order ${orderId} settlement`,
  });

  // BullMQ settlement job
  const job = await settlementQueue.add(
    "walletSettlement",
    {
      vendorId,
      amount,
      transactionId: transaction._id,
    },
    {
      delay: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  );

  // save jobId
  transaction.settlementJobId = job.id;
  await transaction.save();
};

// settlement trigger
//   if (status === "DELIVERED") {
//     await addSettlement(
//       order.vendorId,
//       order._id,
//       order.amount
//     );

//   }

// ----------->
// DELIVERED
// ↓
// RETURN_REQUESTED
// ↓
// RETURNED

// const job = await settlementQueue.getJob(transaction.settlementJobId);
// if (job) {
//   await job.remove();
// }

// ya ye flow
// const tx = await vendorTransactionModel.findOne({ orderId });
// if (tx?.settlementJobId) {
//   const job = await settlementQueue.getJob(tx.settlementJobId);
//   if (job) {
//     await job.remove();
//   }
// }

export const getWallet = async (req, res) => {
  const vendorId = req.user.id;
  const wallet = await Wallet.findOne({ vendorId });

  if (!wallet) {
    return res.status(404).json({
      message: "Wallet not found",
    });
  }

  const transactions = await vendorTransactionModel
    .find({ vendorId })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    totalBalance: wallet.totalBalance,
    available: wallet.availableBalance,
    onHold: wallet.onHoldBalance,
    transactions,
  });
};

export const getAllTransactionHistory = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const transactions = await vendorTransactionModel
      .find({ vendorId })
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
