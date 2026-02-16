
// writen by priyanshu
const mongoose = require("mongoose");
const razorpay = require("../config/razorpay");
const transactionModel = require("../../models/user/transaction.model");
const APIError = require("../../middleware/errorHandler");



exports.createWalletTopup = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  try {
   const { amount } = req.body;
    const userId = req.user._id;

    if (!amount) {
      throw new APIError(400, "Amount required");
    }

    const company = await companyModel.findOne();

    if (!company) {
      throw new APIError(404, "Company config not found");
    }

    const isValidAmount = company.walletTopupAmounts.includes(amount);

    if (!isValidAmount) {
      return res.status(400).json({
        message: "Invalid top-up amount"
      });
    }


    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `wallet_${Date.now()}`
    });

    const transaction = await transactionModel.create([{
      userId,
      amount,
      currency: "INR",
      paymentGateway: "RAZORPAY",
      razorpayOrderId: order.id,
      status: "PENDING",
      payType: "CREDIT",
      walletPurpose: "TOPUP"
    }],{session});

     await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      order,
      transaction
    });
   
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
     next(error);
  }
};



const crypto = require("crypto");
const walletModel = require("../models/wallet.model");

exports.verifyWalletTopup = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const userId = req.user._id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid signature");
    }

    const transaction = await transactionModel.findOne({
      razorpayOrderId: razorpay_order_id,
      userId
    }).session(session);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "SUCCESS") {
      throw new Error("Already processed");
    }

    // 3️⃣ Find or Create Wallet
    let wallet = await walletModel.findOne({ userId }).session(session);

    if (!wallet) {
      wallet = await walletModel.create(
        [{ userId, balance: 0 }],
        { session }
      );
      wallet = wallet[0];
    }

    // 4️⃣ Credit Wallet
    await walletModel.findByIdAndUpdate(
      wallet._id,
      { $inc: { balance: transaction.amount } },
      { new: true, session }
    );

    // 5️⃣ Update Transaction Status
    transaction.status = "SUCCESS";
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paymentMethod = "ONLINE";

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Wallet credited successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
