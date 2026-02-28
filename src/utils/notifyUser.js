// export const notifyUser = async ({ userId, title, message, type }) => {
//   await Notification.create({
//     userId,
//     vendorId,
//     title,
//     message,
//     type,
//     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//   });

//   await sendPushNotification({
//     userId,
//     title,
//     body: message,
//     type,
//     orderId,
//   });
// };

import Notification from "../models/notification.model.js";
import { sendPushNotification } from "./sendPushNotification.js";
import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";

export const notifyUser = async ({
  userId,
  vendorId,
  title,
  message,
  image,
  type,
}) => {
  try {
    if (userId && vendorId) {
      throw new Error("Pass either userId or vendorId, not both");
    }
    await Notification.create({
      userId: userId || null,
      vendorId: vendorId || null,
      title,
      message,
      image: image || null,
      type,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // specific user ya vendor ko
    if (userId || vendorId) {
      await sendPushNotification({
        userId: userId || null,
        vendorId: vendorId || null,
        title,
        body: message,
        image: image || null,
        type,
      });
    } else {
      // global — send all
      const [users, vendors] = await Promise.all([
        User.find({ fcmToken: { $ne: null } }),
        VendorProfile.find({ fcmToken: { $ne: null } }),
      ]);

      for (const user of users) {
        await sendPushNotification({
          userId: user._id,
          title,
          body: message,
          image,
          type,
        });
      }

      for (const vendor of vendors) {
        await sendPushNotification({
          vendorId: vendor._id,
          title,
          body: message,
          image,
          type,
        });
      }
    }
  } catch (err) {
    console.error("notifyUser error:", err);
    throw err;
  }
};
