import vendorTransactionModel from "../../models/vendorShop/vendorTransaction.model.js";
import vendorWalletModel from "../../models/vendorShop/vendorWallet.model.js";
import vendorWithdrawalBalanceModel from "../../models/vendorShop/vendorWithdrawalBalance.model.js";

export const requestWithdraw = async (req, res) => {
  const vendorId = req.user.id;
  const { amount, bankAccountId } = req.body;

  const wallet = await vendorWalletModel.findOne({ vendorId });

  if (wallet.availableBalance < amount) {
    return res.status(400).json({
      message: "Insufficient balance",
    });
  }

  const request = await vendorWithdrawalBalanceModel.create({
    vendorId,
    amount,
    bankAccountId: bankAccountId || "",
  });

  res.json({
    success: true,
    message: "Withdrawal request sent",
    data: request,
  });
};
export const approveWithdraw = async (req, res) => {
  const { withdrawalId } = req.params;

  const withdrawal = await vendorWithdrawalBalanceModel.findById(withdrawalId);
  const wallet = await vendorWalletModel.findOne({
    vendorId: withdrawal.vendorId,
  });

  wallet.availableBalance -= withdrawal.amount;
  wallet.totalBalance -= withdrawal.amount;

  await wallet.save();

  withdrawal.status = "APPROVED";
  await withdrawal.save();

  await vendorTransactionModel.create({
    vendorId: withdrawal.vendorId,
    type: "WITHDRAWAL",
    amount: withdrawal.amount,
    status: "COMPLETED",
    description: "Withdrawal to bank",
  });

  res.json({
    success: true,
    message: "Withdrawal approved",
  });
};
export const rejectWithdraw = async (req, res) => {
  const { withdrawalId } = req.params;

  const withdrawal = await vendorWithdrawalBalanceModel.findById(withdrawalId);

  if (!withdrawal) {
    return res.status(404).json({ message: "Request not found" });
  }

  const wallet = await vendorWalletModel.findOne({
    vendorId: withdrawal.vendorId,
  });

  wallet.pendingWithdrawal -= withdrawal.amount;

  await wallet.save();

  withdrawal.status = "REJECTED";
  withdrawal.adminNote = "Bank details invalid";

  await withdrawal.save();

  res.json({
    success: true,
    message: "Withdrawal rejected",
  });
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
