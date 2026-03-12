import { Queue } from "bullmq";
import { connection } from "../config/bullmq.config.js";

export const settlementQueue = new Queue("wallet-settlement-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

console.log("Wallet Settlement Queue initialized");
