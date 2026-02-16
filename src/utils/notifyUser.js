import Notification from "../models/notification.model.js";
import { sendPushNotification } from "./sendPushNotification.js";

export const notifyUser = async ({ userId, title, message, type }) => {
  await Notification.create({
    userId,
    title,
    message,
    type,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await sendPushNotification({
    userId,
    title,
    body: message,
    type,
    bookingId,
  });
};
