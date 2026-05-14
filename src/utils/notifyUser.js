

import Notification from "../models/notification.model.js";
import { sendPushNotification } from "./sendPushNotification.js";
import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";


import notificationQueue from "../config/notification.queue.js";

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
    // save notification (same as before)

    await Notification.create({
      userId: userId || null,
      vendorId: vendorId || null,
      title,
      message,
      image: image || null,
      type: type?.trim().toUpperCase(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    //  DIRECT SEND KI JAGAH QUEUE ME DAL DO
    await notificationQueue.add("send-notification", {
      userId,
      vendorId,
      title,
      message,
      image,
      type,
    });
  } catch (err) {
    console.error("notifyUser error:", err);
    throw err;
  }
};
