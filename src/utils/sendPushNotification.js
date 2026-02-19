import admin from "../config/firebase.config.js";
import User from "../models/user/user.model.js";

export const sendPushNotification = async ({
  userId,
  title,
  body,
  type = "system",
  bookingId = null,
}) => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.fcmToken) return;
    const message = {
      token: user.fcmToken,

      notification: {
        title,
        body,
      },

      data: {
        type: String(type),
        bookingId: bookingId ? bookingId.toString() : "",
      },

      android: {
        priority: "high",
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error(err.code, err.message);
    }
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered") {
      await User.findByIdAndUpdate(userId, { fcmToken: null });
    }
  }
};
