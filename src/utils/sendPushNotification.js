// import admin from "../config/firebase.config.js";
// import User from "../models/user/user.model.js";

// export const sendPushNotification = async ({
//   userId,
//   title,
//   body,
//   type = "system",
//   bookingId = null,
// }) => {
//   try {
//     const user = await User.findById(userId);

//     if (!user || !user.fcmToken) return;
//     const message = {
//       token: user.fcmToken,

//       notification: {
//         title,
//         body,
//       },

//       data: {
//         type: String(type),
//         bookingId: bookingId ? bookingId.toString() : "",
//       },

//       android: {
//         priority: "high",
//       },
//     };

//     try {
//       await admin.messaging().send(message);
//     } catch (err) {
//       console.error(err.code, err.message);
//     }
//   } catch (error) {
//     if (error.code === "messaging/registration-token-not-registered") {
//       await User.findByIdAndUpdate(userId, { fcmToken: null });
//     }
//   }
// };

import admin from "../config/firebase.config.js";
import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";

export const sendPushNotification = async ({
  userId,
  vendorId,
  title,
  body,
  image = null,
  type = "system",
}) => {
  try {
    // specific user ya vendor
    if (userId || vendorId) {
      let recipient = null;

      if (userId) {
        recipient = await User.findById(userId);
      } else if (vendorId) {
        recipient = await VendorProfile.findById(vendorId);
      }

      if (!recipient || !recipient.fcmToken) return;

      const message = {
        token: recipient.fcmToken,
        notification: { title, body, ...(image && { imageUrl: image }) },
        data: { type: String(type) },
        android: { priority: "high" },
      };

      try {
        await admin.messaging().send(message);
      } catch (err) {
        console.error("FCM error:", err.code, err.message);
        if (err.code === "messaging/registration-token-not-registered") {
          if (userId) await User.findByIdAndUpdate(userId, { fcmToken: null });
          if (vendorId)
            await VendorProfile.findByIdAndUpdate(vendorId, { fcmToken: null });
        }
      }
    } else {
      const [users, vendors] = await Promise.all([
        User.find({ fcmToken: { $ne: null } }),
        VendorProfile.find({ fcmToken: { $ne: null } }),
      ]);

      for (const user of users) {
        await sendPushNotification({
          userId: user._id,
          title,
          body,
          image,
          type,
        });
      }

      for (const vendor of vendors) {
        await sendPushNotification({
          vendorId: vendor._id,
          title,
          body,
          image,
          type,
        });
      }
    }
  } catch (error) {
    console.error("sendPushNotification error:", error);
    throw error;
  }
};
