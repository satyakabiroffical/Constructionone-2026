// import { Worker } from "bullmq";
// import { connection } from "../config/bullmq.config.js";

// // Create a worker for processing notifications
// const notificationWorker = new Worker('notification-worker', async job => {
//   // Process the job
//   // Logic for sending notifications
// }, {
//   connection,
// });

// // Start the worker
// notificationWorker.start();

// // Add a job to the notification queue
// const notificationJob = notificationQueue.add('send-notification', {

//   // Job data
//   // Example: { recipient: 'user@example.com', message: 'Hello, this is a notification!' }
// });

// // You can also listen for job completion events
// notificationQueue.on('completed', (job) => {
//   console.log(`Notification job ${job.id} completed`);
// });
// export default notificationWorker;

import notificationQueue from "../config/notification.queue.js";
import { Worker } from "bullmq";
import { connection } from "../config/bullmq.config.js";
import { sendPushNotification } from "../utils/sendPushNotification.js";
import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";
const notificationWorker = new Worker(
  "notification-queue",
  async (job) => {
    const { userId, vendorId, title, message, image, type } = job.data;

    console.log("Processing notification job:", job.id);

    // 1. specific user/vendor
    if (userId || vendorId) {
      await sendPushNotification({
        userId,
        vendorId,
        title,
        body: message,
        image,
        type,
      });
    }

    // 2 global case (admin → all users)
    else {
      const [users, vendors] = await Promise.all([
        User.find({ fcmToken: { $ne: null } }),
        VendorProfile.find({ fcmToken: { $ne: null } }),
      ]);

      // parallel send
      await Promise.all([
        ...users.map((user) =>
          sendPushNotification({
            userId: user._id,
            title,
            body: message,
            image,
            type,
          }),
        ),
        ...vendors.map((vendor) =>
          sendPushNotification({
            vendorId: vendor._id,
            title,
            body: message,
            image,
            type,
          }),
        ),
      ]);
    }
  },
  { connection },
);

// // You can also listen for job completion events
notificationQueue.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

export default notificationWorker;
