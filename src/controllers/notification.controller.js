import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";
import Notification from "../models/notification.model.js";
import { notifyUser } from "../utils/notifyUser.js";
import mongoose from "mongoose";
import { createActivityLog } from "./admin/activityLog.controller.js";
//admin funtions for notification to users and vendors
export const notifyOnlyAllUsers = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    if (req.files?.image?.length) {
      req.body.image = req.files.image[0].key;
    }

    const image = req.body.image || null;

    const users = await User.find({ fcmToken: { $ne: null } });

    if (!users.length) {
      return res.status(404).json({ message: "No users found with FCM token" });
    }

    await Promise.all(
      users.map((user) =>
        notifyUser({ userId: user._id, title, message, image, type: "ADMIN" }),
      ),
    );
    await createActivityLog({
      req,
      action: "BULK_NOTIFICATION_USERS",
      module: "NOTIFICATION",
      details: {
        title,
        message,
        totalUsers: users.length,
        hasImage: !!image,
      },
    });
    res.status(200).json({
      success: true,
      message: "Notification sent to all users",
    });
  } catch (err) {
    next(err);
  }
};
export const notifyOnlyAllVendors = async (req, res, next) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    if (req.files?.image?.length) {
      req.body.image = req.files.image[0].key;
    }

    const image = req.body.image || null;

    const vendors = await VendorProfile.find({ fcmToken: { $ne: null } });

    if (!vendors.length) {
      return res
        .status(404)
        .json({ message: "No vendors found with FCM token" });
    }

    await Promise.all(
      vendors.map((vendor) =>
        notifyUser({
          vendorId: vendor._id,
          title,
          message,
          image,
          type: "ADMIN",
        }),
      ),
    );

    await createActivityLog({
      req,
      action: "BULK_NOTIFICATION_VENDORS",
      module: "NOTIFICATION",

      details: {
        title,
        message,
        totalVendors: vendors.length,
        hasImage: !!image,
      },
    });

    res.status(200).json({
      success: true,
      message: "Notification sent to all vendors",
    });
  } catch (err) {
    next(err);
  }
};
//send notification any one vendor or user by admin
export const notifySingleUser = async (req, res) => {
  try {
    const { userId, vendorId, title, message } = req.body;
    if (!userId && !vendorId) {
      return res
        .status(400)
        .json({ message: "userId or vendorId is required" });
    }

    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required" });
    }

    if (req.files?.image?.length) {
      req.body.image = req.files.image[0].location;
    }

    const notificationMessage = await notifyUser({
      ...(userId ? { userId } : { vendorId }),
      title,
      message,
      image: req.body.image || null,
    });

    await createActivityLog({
      req,
      action: userId ? "SEND_NOTIFICATION_USER" : "SEND_NOTIFICATION_VENDOR",
      module: "NOTIFICATION",
      targetId: userId || vendorId,

      details: {
        title,
        message,
        hasImage: !!req.body.image,
        type: userId ? "USER" : "VENDOR",
      },
    });

    res.json({
      success: true,
      message: `Notification sent to ${userId ? "user" : "vendor"}`,
      notificationMessage,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send notification" });
  }
};
// export const notifyAllVendorsAndUsers = async (req, res, next) => {
//   try {
//     const { title, message } = req.body;
//     if (!title || !message) {
//       return res
//         .status(400)
//         .json({ message: "Title and message are required" });
//     }

//     if (req.files?.image?.length) {
//       req.body.image = req.files.image[0].key;
//     }

//     const image = req.body.image || null;

//     const [users, vendors] = await Promise.all([
//       User.find({ fcmToken: { $ne: null } }),
//       VendorProfile.find({ fcmToken: { $ne: null } }),
//     ]);

//     if (!users.length && !vendors.length) {
//       return res
//         .status(404)
//         .json({ message: "No users or vendors found with FCM token" });
//     }

//     for (const user of users) {
//       await notifyUser({
//         userId: user._id,
//         title,
//         message,
//         image,
//         type: "ADMIN",
//       });
//     }

//     for (const vendor of vendors) {
//       await notifyUser({
//         vendorId: vendor._id,
//         title,
//         message,
//         image,
//         type: "ADMIN",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Notification sent to all users and vendors",
//     });
//   } catch (err) {
//     next(err);
//   }
// };
//mark read

export const notifyAllVendorsAndUsers = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    if (req.files?.image?.length) {
      req.body.image = req.files.image[0].location;
    }

    const image = req.body.image || null;

    const [users, vendors] = await Promise.all([
      User.find({ fcmToken: { $ne: null } }),
      VendorProfile.find({ fcmToken: { $ne: null } }),
    ]);

    if (!users.length && !vendors.length) {
      return res
        .status(404)
        .json({ message: "No users or vendors found with FCM token" });
    }

    // ======================================================
    // SEND NOTIFICATIONS
    // ======================================================

    await Promise.all([
      ...users.map((user) =>
        notifyUser({
          userId: user._id,
          title,
          message,
          image,
          type: "ADMIN",
        }),
      ),

      ...vendors.map((vendor) =>
        notifyUser({
          vendorId: vendor._id,
          title,
          message,
          image,
          type: "ADMIN",
        }),
      ),
    ]);

    // ======================================================
    // ACTIVITY LOG
    // ======================================================

    await createActivityLog({
      req,
      action: "BULK_NOTIFICATION_ALL",
      module: "NOTIFICATION",
      details: {
        title,
        message,
        totalUsers: users.length,
        totalVendors: vendors.length,
        totalRecipients: users.length + vendors.length,
        hasImage: !!image,
      },
    });

    res.status(200).json({
      success: true,
      message: "Notification sent to all users and vendors",
      totalUsers: users.length,
      totalVendors: vendors.length,
    });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    next(err);
  }
};

//get for notification
// export const getUserNotifications = async (req, res) => {
//   try {
//     if (!req.user?.id) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//     const userId = req.user.id;

//     // const query = {
//     //   expiresAt: { $gt: new Date() },
//     //   vendorId: { $exists: false }, // vendorId wali exclude karo
//     //   $or: [
//     //     { userId: userId }, // user-specific
//     //     { userId: null }, // global (null set hai)
//     //     { userId: { $exists: false } }, // global (field hi nahi)
//     //   ],
//     // };

//     const query = {
//       expiresAt: { $gt: new Date() },
//       vendorId: null,
//       $or: [
//         { userId: new mongoose.Types.ObjectId(userId) }, // ✅ fix
//         { userId: null },
//       ],
//     };
//     const notifications = await Notification.find(query).sort({
//       createdAt: -1,
//     });

//     res.json({
//       success: true,
//       notifications,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch notifications" });
//   }
// };

export const getUserNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const query = {
      expiresAt: { $gt: new Date() },

      $or: [{ userId: userId }, { userId: null, vendorId: null }],
    };

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};
export const getVendorNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const vendorId = req.user.id;

    const query = {
      $or: [{ vendorId: vendorId }, { userId: null, vendorId: null }],
    };

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const sendOrderNotificationToUser = async (order, status) => {
  try {
    const statusMessages = {
      CONFIRMED: "Your order has been confirmed!",
      PENDING: "Your order is pending payment.",
      CANCELLED: "Your order has been cancelled.",
      OUT_FOR_DELIVERY: "Your order is out for delivery!",
      DELIVERED: "Your order has been delivered. Enjoy!",
      VENDOR_CONFIRMED: "Your order has been accepted by the vendor.",
      VENDOR_CANCELLED: "Your order was rejected by the vendor.",
    };

    const message =
      statusMessages[status] ||
      `Your order status has been updated to: ${status}`;

    await notifyUser({
      userId: order.userId,
      title: "Order Update",
      message,
      type: "ORDER",
    });
  } catch (err) {
    console.error("sendOrderNotificationToUser failed:", err.message);
  }
};
// Internal helper — Send new order notification to a vendor
export const sendOrderNotificationToVendor = async (subOrder) => {
  try {
    const vendorId = subOrder.vandorId;
    const orderId = subOrder._id;
    if (!vendorId) return;

    const itemCount = subOrder.items?.length || 0;
    const amount = subOrder.totalAmount || 0;

    await Notification.create({
      vendorId,
      title: "New Order Received 🛒",
      message: `You have a new order with ${itemCount} item(s) worth ₹${amount}. Please review and confirm.`,
      type: "system",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await sendPushNotification({
      vendorId,
      title,
      body: message,
      type,
      orderId,
    });
  } catch (err) {
    console.error("sendOrderNotificationToVendor failed:", err.message);
  }
};

export const getAllnotification = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};
