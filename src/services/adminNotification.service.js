// services/notificationService.js

import admin from "../config/adminWebFirebase.config.js";
import adminNotificationModel from "../models/admin/adminNotification.model.js";
import User from "../models/user/user.model.js";
export const sendAdminNotification = async ({
  title,
  message,
  type,
  redirectUrl,
  color = "blue",
  userId = null,
  data = {},
}) => {
  try {
    // save DB
    await adminNotificationModel.create({
      title,
      message,
      type,
      color,
      userId,
      redirectUrl,
    });

    // auto fetch admin token (since only 1 admin)
    const adminUser = await User.findOne({ role: "ADMIN" }, "fcmToken");

    if (!adminUser?.fcmToken) return;

    await admin.messaging().send({
      token: adminUser.fcmToken,
      notification: {
        title,
        body: message,
      },
      data: {
        redirectUrl: redirectUrl || "",
        type: type || "",
        ...data,
      },
    });
  } catch (error) {
    console.log("Notification Error:", error);
  }
};

// await sendAdminNotification({
//   title: "New User Registered",
//   message: `${user.firstName} ${user.lastName} has verified account successfully`,
//   type: "USER_CREATED",
//   redirectUrl: "/admin/users",
//   color: "green",
//   userId: user._id,
// });
