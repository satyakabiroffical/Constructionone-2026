import { Queue } from "bullmq";
import redisConnection from "./redis.config.js";

// Redis connection options for BullMQ
export const connection = {
    host: redisConnection.options.host,
    port: redisConnection.options.port,
    password: redisConnection.options.password,
    maxRetriesPerRequest: null, // Required by BullMQ
};

// Shipping Queue
export const shippingQueue = new Queue("shipping-queue", {
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

console.log("BullMQ Shipping Queue initialized");
