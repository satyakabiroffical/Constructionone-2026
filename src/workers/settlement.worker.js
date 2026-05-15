import { Worker } from "bullmq";
import { connection } from "../config/bullmq.config.js";
import Wallet from "../models/vendorShop/vendorWallet.model.js";
import Transaction from "../models/vendorShop/vendorTransaction.model.js";
import logger from "../utils/logger.js";

// const settlementWorker = new Worker(
//   "wallet-settlement-queue",

//   async (job) => {
//     const { vendorId, amount, transactionId } = job.data;
//     const transaction = await Transaction.findById(transactionId);

//     // Safety check
//     if (!transaction || transaction.status !== "HOLD") {
//       console.log("Settlement skipped:", transactionId);
//       return;
//     }

//     const wallet = await Wallet.findOne({ vendorId });
//     if (!wallet) return;

//     wallet.availableBalance += amount;
//     wallet.onHoldBalance -= amount;

//     await wallet.save();
//     transaction.status = "AVAILABLE";
//     await transaction.save();

//     console.log("Settlement done:", vendorId);
//   },

//   { connection },
// );

import mongoose from "mongoose";

const settlementWorker = new Worker(
  "wallet-settlement-queue",

  async (job) => {
    const { vendorId, amount, transactionId } = job.data;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transaction =
        await Transaction.findById(transactionId).session(session);

      if (!transaction) {
        await session.abortTransaction();
        session.endSession();
        return;
      }
      if (transaction.status === "SETTLED") {
        console.log("Already settled:", transactionId);
        await session.abortTransaction();
        session.endSession();
        return;
      }
      if (transaction.status !== "HOLD") {
        console.log("Invalid status:", transaction.status);
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const wallet = await Wallet.findOne({ vendorId }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      if (wallet.onHoldBalance < amount) {
        throw new Error("Insufficient hold balance");
      }

      wallet.onHoldBalance -= amount;
      wallet.availableBalance += amount;

      wallet.totalBalance =
        (wallet.availableBalance || 0) + (wallet.onHoldBalance || 0);

      await wallet.save({ session });

      transaction.status = "SETTLED";
      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      console.log("Settlement done:", vendorId);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Settlement failed:", error.message);
      throw error; // BullMQ retry karega
    }
  },

  { connection },
);

settlementWorker.on("completed", (job) => {
  logger.info(`settlementWorker job ${job.id} completed`);
});

settlementWorker.on("failed", (job, err) => {
  logger.error(`settlementWorker job ${job.id} failed: ${err.message}`);
});
export default settlementWorker;
