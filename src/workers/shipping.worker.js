import { Worker } from "bullmq"; // priyanshu
import { connection } from "../config/bullmq.config.js";
import { generateShippingLabel } from "../services/shipping.service.js";
import Order from "../models/marketPlace/order.model.js";
import logger from "../utils/logger.js";

const shippingWorker = new Worker(
    "shipping-queue",
    async (job) => {
        const { orderId } = job.data;
        logger.info(`Processing shipping label for order: ${orderId}`);

        try {
            // 1. Fetch the latest order doc
            const order = await Order.findById(orderId);
            if (!order) {
                logger.error(`Order not found: ${orderId}`);
                return;
            }

            // 2. Generate the label (calls HTML gen -> PDF gen -> S3 upload)
            const result = await generateShippingLabel(order);

            // 3. Update the order with tracking and label URL
            order.trackingNumber = result.trackingNumber;
            order.labelUrl = result.labelUrl;
            await order.save();

            logger.info(`Successfully generated label for order: ${orderId}. URL: ${result.labelUrl}`);
        } catch (error) {
            logger.error(`Failed to process shipping label for order: ${orderId}. Error: ${error.message}`);
            throw error; // Let BullMQ handle retries
        }
    },
    { connection }
);

shippingWorker.on("completed", (job) => {
    logger.info(`Shipping label job ${job.id} completed`);
});

shippingWorker.on("failed", (job, err) => {
    logger.error(`Shipping label job ${job.id} failed: ${err.message}`);
});

export default shippingWorker;
